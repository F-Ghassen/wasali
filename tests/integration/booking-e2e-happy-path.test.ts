/**
 * tests/integration/booking-e2e-happy-path.test.ts
 *
 * Full happy-path: search → book → driver confirms → in_transit → delivered → rate.
 * Each step asserts the resulting DB state before advancing to the next.
 *
 * Run: npx vitest run tests/integration/booking-e2e-happy-path.test.ts
 * Requires: supabase start
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe.skipIf(SKIP)('Booking happy path (end-to-end)', () => {
  let driver: TestUser;
  let sender: TestUser;
  let routeId: string;
  let bookingId: string;

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
    routeId = await seedRoute(driver.userId, {
      available_weight_kg: 50,
      price_per_kg_eur: 8,
    });
  });

  afterAll(async () => {
    if (bookingId) {
      await adminClient.from('bookings').delete().eq('id', bookingId).then(() => {}).catch(() => {});
    }
    await cleanupRoute(routeId).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── Step 1: Sender searches and finds the route ───────────────────────────

  it('1. sender can search and find the seeded route with available capacity', async () => {
    const { data, error } = await sender.client
      .from('routes')
      .select('id, available_weight_kg, price_per_kg_eur, status')
      .eq('id', routeId)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('active');
    expect(data!.available_weight_kg).toBeGreaterThan(0);
    expect(data!.price_per_kg_eur).toBe(8);
  });

  // ── Step 2: Sender submits booking → pending + unpaid ────────────────────

  it('2. sender submits booking → status=pending, payment_status=unpaid', async () => {
    const { data, error } = await sender.client
      .from('bookings')
      .insert({
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: routeId,
        payment_type: 'cash_on_collection',
        payment_status: 'unpaid',
        package_weight_kg: 5,
        price_eur: 40,
      })
      .select('id, status, payment_status, payment_type')
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('pending');
    expect(data!.payment_status).toBe('unpaid');
    expect(data!.payment_type).toBe('cash_on_collection');

    bookingId = data!.id;
  });

  // ── Step 3: Driver fetches and sees the pending booking ───────────────────

  it('3. driver fetches bookings on their route and sees the pending booking', async () => {
    const { data: routes } = await driver.client
      .from('routes')
      .select('id')
      .eq('driver_id', driver.userId);

    const routeIds = (routes ?? []).map((r) => r.id);
    expect(routeIds).toContain(routeId);

    const { data, error } = await driver.client
      .from('bookings')
      .select('id, status')
      .in('route_id', routeIds)
      .eq('status', 'pending');

    expect(error).toBeNull();
    expect(data!.some((b) => b.id === bookingId)).toBe(true);
  });

  // ── Step 4: Driver confirms booking → capacity decremented ────────────────

  it('4. driver confirms booking → status=confirmed, route capacity decremented', async () => {
    // Confirm
    const { error: confirmErr } = await driver.client
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    expect(confirmErr).toBeNull();

    // Decrement capacity
    const { error: rpcErr } = await driver.client.rpc('decrement_route_capacity', {
      p_route_id: routeId,
      p_weight_kg: 5,
    });
    expect(rpcErr).toBeNull();

    // Assert status
    const { data: booking } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    expect(booking!.status).toBe('confirmed');

    // Assert capacity decreased
    const { data: route } = await adminClient
      .from('routes')
      .select('available_weight_kg')
      .eq('id', routeId)
      .single();
    expect(route!.available_weight_kg).toBeLessThanOrEqual(45);
  });

  // ── Step 5: Driver marks in_transit ───────────────────────────────────────

  it('5. driver marks booking as in_transit', async () => {
    const { error } = await driver.client
      .from('bookings')
      .update({ status: 'in_transit', updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    expect(data!.status).toBe('in_transit');
  });

  // ── Step 6: Driver marks delivered ────────────────────────────────────────
  // Note: in production this goes via capture-payment edge fn.
  // Here we test the DB transition directly (edge fn tested in separate suite).

  it('6. driver marks booking as delivered', async () => {
    const { error } = await driver.client
      .from('bookings')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    expect(data!.status).toBe('delivered');
  });

  // ── Step 7: Sender rates the driver ───────────────────────────────────────

  it('7. sender can rate the driver after delivery', async () => {
    const { error } = await sender.client
      .from('ratings')
      .insert({
        booking_id: bookingId,
        sender_id: sender.userId,
        driver_id: driver.userId,
        score: 5,
        comment: 'Great driver, fast delivery!',
        rater_type: 'sender',
      });
    expect(error).toBeNull();

    // Booking status remains 'delivered' — rating doesn't change it
    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    expect(data!.status).toBe('delivered');
  });
});
