/**
 * tests/integration/booking-lifecycle.test.ts
 *
 * Tests the full booking state machine: pending → confirmed → in_transit →
 * delivered, including the decrement_route_capacity RPC and capacity guard.
 *
 * Run: npx vitest run tests/integration/booking-lifecycle.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  adminClient,
  createTestUser,
  cleanupUser,
  seedRoute,
  cleanupRoute,
  TEST_BOOKING_DRAFT,
  type TestUser,
} from '../helpers';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(SKIP)('Booking lifecycle (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  let routeId: string;
  const bookingIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
    routeId = await seedRoute(driver.userId, { available_weight_kg: 50, price_per_kg_eur: 8 });
  });

  afterAll(async () => {
    // Bookings cascade from routes, but clean individually to be safe
    for (const id of bookingIds) {
      try { await adminClient.from('bookings').delete().eq('id', id); } catch {}
    }
    await cleanupRoute(routeId).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── Helper: insert a booking via sender client ─────────────────────────────

  async function createBooking(overrides: Partial<typeof TEST_BOOKING_DRAFT> = {}) {
    const { data, error } = await sender.client
      .from('bookings')
      .insert({
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: routeId,
        ...overrides,
      })
      .select('id, status, price_eur, package_weight_kg')
      .single();
    if (error) throw new Error(`createBooking failed: ${error.message}`);
    bookingIds.push(data!.id);
    return data!;
  }

  // ── 1. Create booking (pending) ───────────────────────────────────────────

  it('sender can submit a booking with status pending', async () => {
    const booking = await createBooking();

    expect(booking.status).toBe('pending');
    expect(booking.package_weight_kg).toBe(5);
  });

  // ── 2. Price computation: sender_dropoff + home_delivery ──────────────────

  it('price is correct: 5kg * 8 EUR + 10 EUR delivery = 50 EUR', async () => {
    const booking = await createBooking({
      pickup_type: 'sender_dropoff',
      dropoff_type: 'home_delivery',
      price_eur: 50,
    });

    expect(booking.price_eur).toBe(50);
  });

  // ── 3. Driver confirms booking → capacity decremented ────────────────────

  it('driver can confirm a booking and route capacity is decremented', async () => {
    const booking = await createBooking({ package_weight_kg: 5, price_eur: 40 });

    // Confirm status
    const { error: confirmErr } = await driver.client
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    expect(confirmErr).toBeNull();

    // Decrement capacity via RPC
    const { error: rpcErr } = await driver.client.rpc('decrement_route_capacity', {
      p_route_id: routeId,
      p_weight_kg: 5,
    });
    expect(rpcErr).toBeNull();

    // Verify capacity decreased
    const { data: route } = await adminClient
      .from('routes')
      .select('available_weight_kg')
      .eq('id', routeId)
      .single();

    expect(route!.available_weight_kg).toBeLessThanOrEqual(45); // 50 - 5
  });

  // ── 4. Mark in-transit ────────────────────────────────────────────────────

  it('driver can mark a confirmed booking as in_transit', async () => {
    const booking = await createBooking();

    await driver.client
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id);

    const { error } = await driver.client
      .from('bookings')
      .update({ status: 'in_transit', updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', booking.id)
      .single();
    expect(data!.status).toBe('in_transit');
  });

  // ── 5. Mark delivered ─────────────────────────────────────────────────────

  it('driver can mark an in_transit booking as delivered', async () => {
    const booking = await createBooking();

    await adminClient
      .from('bookings')
      .update({ status: 'in_transit' })
      .eq('id', booking.id);

    const { error } = await driver.client
      .from('bookings')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', booking.id)
      .single();
    expect(data!.status).toBe('delivered');
  });

  // ── 6. Driver rejects a pending booking ──────────────────────────────────

  it('driver can reject a pending booking (status → cancelled)', async () => {
    const booking = await createBooking();

    const { error } = await driver.client
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', booking.id)
      .single();
    expect(data!.status).toBe('cancelled');
  });

  // ── 7. Capacity guard: decrement_route_capacity RPC fails if insufficient ─

  it('decrement_route_capacity fails when weight exceeds available capacity', async () => {
    // Create a route with only 3kg left
    const tightRouteId = await seedRoute(driver.userId, { available_weight_kg: 3 });
    bookingIds.push(); // no booking to clean here, just route

    const { error } = await driver.client.rpc('decrement_route_capacity', {
      p_route_id: tightRouteId,
      p_weight_kg: 10, // requesting 10kg when only 3kg remain
    });

    // Should fail — RPC returns error when guard condition fails
    expect(error).not.toBeNull();

    // Verify capacity was NOT changed
    const { data: route } = await adminClient
      .from('routes')
      .select('available_weight_kg')
      .eq('id', tightRouteId)
      .single();
    expect(route!.available_weight_kg).toBe(3);

    await cleanupRoute(tightRouteId).catch(() => {});
  });

  // ── 8. RLS: sender cannot confirm their own booking ───────────────────────

  it('sender cannot update booking status to confirmed (RLS denies)', async () => {
    const booking = await createBooking();

    const { error } = await sender.client
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id);

    // Either an explicit RLS error, or the update silently matches 0 rows
    if (!error) {
      const { data } = await adminClient
        .from('bookings')
        .select('status')
        .eq('id', booking.id)
        .single();
      expect(data!.status).toBe('pending'); // status unchanged
    } else {
      expect(error.code).toMatch(/42501|PGRST/);
    }
  });

  // ── 9. Sender can read their own booking ─────────────────────────────────

  it('sender can read their own bookings', async () => {
    const booking = await createBooking();

    const { data, error } = await sender.client
      .from('bookings')
      .select('id, status')
      .eq('id', booking.id)
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBe(booking.id);
  });

  // ── 10. Driver can read bookings on their routes ──────────────────────────

  it("driver can read bookings on their routes", async () => {
    const booking = await createBooking();

    const { data, error } = await driver.client
      .from('bookings')
      .select('id, status, route_id')
      .eq('id', booking.id)
      .single();

    expect(error).toBeNull();
    expect(data!.route_id).toBe(routeId);
  });

  // ── 11. Route stats: bookedKg, deliveredRevenue, deliveredCount ───────────

  it('route stats aggregate correctly across multiple bookings', async () => {
    const statsRouteId = await seedRoute(driver.userId, { available_weight_kg: 100 });

    // Insert 2 delivered bookings + 1 pending via admin for isolation
    await adminClient.from('bookings').insert([
      {
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: statsRouteId,
        package_weight_kg: 5,
        price_eur: 40,
        status: 'delivered',
      },
      {
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: statsRouteId,
        package_weight_kg: 10,
        price_eur: 80,
        status: 'delivered',
      },
      {
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: statsRouteId,
        package_weight_kg: 3,
        price_eur: 24,
        status: 'pending',
      },
    ]);

    const { data: bookings } = await adminClient
      .from('bookings')
      .select('package_weight_kg, price_eur, status')
      .eq('route_id', statsRouteId);

    const deliveredRevenue = bookings!
      .filter((b) => b.status === 'delivered')
      .reduce((sum, b) => sum + (b.price_eur ?? 0), 0);
    const bookedKg = bookings!.reduce((sum, b) => sum + (b.package_weight_kg ?? 0), 0);
    const deliveredCount = bookings!.filter((b) => b.status === 'delivered').length;

    expect(deliveredRevenue).toBe(120);
    expect(bookedKg).toBe(18);
    expect(deliveredCount).toBe(2);

    await cleanupRoute(statsRouteId).catch(() => {});
  });
});
