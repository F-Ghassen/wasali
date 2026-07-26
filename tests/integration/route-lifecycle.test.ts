/**
 * tests/integration/route-lifecycle.test.ts
 *
 * Tests the driver route CRUD lifecycle against a real local Supabase instance.
 * Requires `supabase start` to be running before executing.
 *
 * Run: npx vitest run tests/integration/route-lifecycle.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  adminClient,
  createTestUser,
  cleanupUser,
  cleanupRoute,
  seedRoute,
  TEST_ROUTE,
  TEST_BOOKING_DRAFT,
  type TestUser,
} from '../helpers';
import { STOP_TYPE } from '@/constants/stopTypes';

// ─── Skip if no local Supabase ─────────────────────────────────────────────

const SKIP = process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(SKIP)('Route lifecycle (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  const routeIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
  });

  afterAll(async () => {
    for (const id of routeIds) await cleanupRoute(id).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── 1. Create route (draft) ──────────────────────────────────────────────

  it('driver can create a route in draft status', async () => {
    const { data, error } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'draft' })
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('draft');
    routeIds.push(data!.id);
  });

  // ── 2. Create route with stops ───────────────────────────────────────────

  it('driver can create a route with stops', async () => {
    const { data: route, error: routeErr } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'draft' })
      .select('id')
      .single();

    expect(routeErr).toBeNull();
    const routeId = route!.id;
    routeIds.push(routeId);

    const stops = [
      {
        route_id: routeId,
        city: 'Berlin',
        country: 'DE',
        stop_order: 1,
        stop_type: STOP_TYPE.COLLECTION,
        is_pickup_available: true,
        is_dropoff_available: false,
      },
      {
        route_id: routeId,
        city: 'Tunis',
        country: 'TN',
        stop_order: 2,
        stop_type: STOP_TYPE.DROPOFF,
        is_pickup_available: false,
        is_dropoff_available: true,
      },
    ];

    const { error: stopsErr } = await driver.client
      .from('route_stops')
      .insert(stops);

    expect(stopsErr).toBeNull();

    const { data: fetched } = await driver.client
      .from('route_stops')
      .select('*')
      .eq('route_id', routeId);

    expect(fetched).toHaveLength(2);
    expect(fetched!.map((s) => s.city).sort()).toEqual(['Berlin', 'Tunis']);
  });

  // ── 3. Publish route ─────────────────────────────────────────────────────

  it('driver can publish a draft route to active', async () => {
    const { data: route } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'draft' })
      .select('id')
      .single();
    routeIds.push(route!.id);

    const { error } = await driver.client
      .from('routes')
      .update({ status: 'active' })
      .eq('id', route!.id);

    expect(error).toBeNull();

    const { data: updated } = await driver.client
      .from('routes')
      .select('status')
      .eq('id', route!.id)
      .single();

    expect(updated!.status).toBe('active');
  });

  // ── 4. Route capacity + price fields persist correctly ───────────────────

  it('stores capacity, price, and min_weight correctly', async () => {
    const { data, error } = await driver.client
      .from('routes')
      .insert({
        ...TEST_ROUTE,
        driver_id: driver.userId,
        status: 'active',
        available_weight_kg: 30,
        min_weight_kg: 2,
        price_per_kg_eur: 9.5,
      })
      .select('available_weight_kg, min_weight_kg, price_per_kg_eur')
      .single();

    expect(error).toBeNull();
    expect(data!.available_weight_kg).toBe(30);
    expect(data!.min_weight_kg).toBe(2);
    expect(data!.price_per_kg_eur).toBe(9.5);

    const { data: route } = await driver.client
      .from('routes')
      .select('id')
      .eq('available_weight_kg', 30)
      .eq('driver_id', driver.userId)
      .single();
    if (route) routeIds.push(route.id);
  });

  // ── 5. Mark route full ───────────────────────────────────────────────────

  it('driver can mark a route as full', async () => {
    const { data: route } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'active' })
      .select('id')
      .single();
    routeIds.push(route!.id);

    const { error } = await driver.client
      .from('routes')
      .update({ status: 'full' })
      .eq('id', route!.id);

    expect(error).toBeNull();

    const { data: updated } = await driver.client
      .from('routes')
      .select('status')
      .eq('id', route!.id)
      .single();

    expect(updated!.status).toBe('full');
  });

  // ── 6. Cancel route ──────────────────────────────────────────────────────

  it('driver can cancel an active route', async () => {
    const { data: route } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'active' })
      .select('id')
      .single();
    routeIds.push(route!.id);

    const { error } = await driver.client
      .from('routes')
      .update({ status: 'cancelled' })
      .eq('id', route!.id);

    expect(error).toBeNull();
  });

  // ── 6b. Cancel route cascades: pending/confirmed bookings auto-reject ────
  // (migration 049 — trg_cascade_cancel_bookings)

  it('cancelling a route auto-cancels its pending and confirmed bookings with reason=route_cancelled', async () => {
    const cascadeRouteId = await seedRoute(driver.userId, { available_weight_kg: 50 });
    routeIds.push(cascadeRouteId);

    const { data: pendingBooking } = await adminClient
      .from('bookings')
      .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: cascadeRouteId, status: 'pending', package_weight_kg: 5 })
      .select('id')
      .single();
    const { data: confirmedBooking } = await adminClient
      .from('bookings')
      .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: cascadeRouteId, status: 'confirmed', package_weight_kg: 8 })
      .select('id')
      .single();
    // Confirming normally decrements capacity — mirror that so the restore is observable.
    await adminClient.rpc('decrement_route_capacity', { p_route_id: cascadeRouteId, p_weight_kg: 8 });

    const { error: cancelErr } = await driver.client
      .from('routes')
      .update({ status: 'cancelled' })
      .eq('id', cascadeRouteId);
    expect(cancelErr).toBeNull();

    const { data: bookingsAfter } = await adminClient
      .from('bookings')
      .select('id, status, cancellation_reason')
      .in('id', [pendingBooking!.id, confirmedBooking!.id]);

    for (const b of bookingsAfter!) {
      expect(b.status).toBe('cancelled');
      expect(b.cancellation_reason).toBe('route_cancelled');
    }

    // Confirmed booking's 8kg should be restored (42 after decrement, back to 50).
    const { data: routeAfter } = await adminClient
      .from('routes')
      .select('available_weight_kg')
      .eq('id', cascadeRouteId)
      .single();
    expect(routeAfter!.available_weight_kg).toBe(50);
  });

  // ── 6c. Cascade leaves in_transit/delivered/already-cancelled untouched ──

  it('cancelling a route does not touch in_transit, delivered, or already-cancelled bookings', async () => {
    const cascadeRouteId = await seedRoute(driver.userId, { available_weight_kg: 50 });
    routeIds.push(cascadeRouteId);

    const seed = async (status: string) => {
      const { data } = await adminClient
        .from('bookings')
        .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: cascadeRouteId, status, package_weight_kg: 3 })
        .select('id')
        .single();
      return data!.id;
    };
    const inTransitId = await seed('in_transit');
    const deliveredId = await seed('delivered');
    const alreadyCancelledId = await seed('cancelled');

    await driver.client.from('routes').update({ status: 'cancelled' }).eq('id', cascadeRouteId);

    const { data: after } = await adminClient
      .from('bookings')
      .select('id, status, cancellation_reason')
      .in('id', [inTransitId, deliveredId, alreadyCancelledId]);

    const byId = Object.fromEntries(after!.map((b) => [b.id, b]));
    expect(byId[inTransitId].status).toBe('in_transit');
    expect(byId[deliveredId].status).toBe('delivered');
    // Pre-existing cancellation is untouched — reason stays null, not overwritten.
    expect(byId[alreadyCancelledId].status).toBe('cancelled');
    expect(byId[alreadyCancelledId].cancellation_reason).toBeNull();
  });

  // ── 7. Complete route ────────────────────────────────────────────────────

  it('driver can complete a route', async () => {
    const { data: route } = await driver.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'active' })
      .select('id')
      .single();
    routeIds.push(route!.id);

    const { error } = await driver.client
      .from('routes')
      .update({ status: 'completed' })
      .eq('id', route!.id);

    expect(error).toBeNull();
  });

  // ── 8. Filter routes by status ───────────────────────────────────────────

  it('fetching with filter=active excludes cancelled/completed routes', async () => {
    // Create 1 active + 1 cancelled route for this driver
    const ts = Date.now();
    const [{ data: r1 }, { data: r2 }] = await Promise.all([
      driver.client
        .from('routes')
        .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'active', notes: `filter-test-active-${ts}` })
        .select('id')
        .single(),
      driver.client
        .from('routes')
        .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'cancelled', notes: `filter-test-cancelled-${ts}` })
        .select('id')
        .single(),
    ]);
    routeIds.push(r1!.id, r2!.id);

    const { data } = await driver.client
      .from('routes')
      .select('id, status')
      .eq('driver_id', driver.userId)
      .eq('status', 'active')
      .like('notes', `filter-test-active-${ts}`);

    expect(data).toHaveLength(1);
    expect(data![0].status).toBe('active');
  });

  // ── 9. RLS: sender cannot create a route ────────────────────────────────

  it('sender cannot insert a route (RLS denies)', async () => {
    const { error } = await sender.client
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: sender.userId, status: 'active' });

    // RLS should deny — Postgres returns a 42501 (insufficient_privilege) error
    expect(error).not.toBeNull();
    expect(error!.code).toMatch(/42501|PGRST/);
  });

  // ── 10. RLS: sender can read active routes ───────────────────────────────

  it('sender can read active routes', async () => {
    // Seed one active route via admin
    const { data: route } = await adminClient
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'active' })
      .select('id')
      .single();
    routeIds.push(route!.id);

    const { data, error } = await sender.client
      .from('routes')
      .select('id, status')
      .eq('status', 'active')
      .limit(1);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  // ── 11. RLS: driver cannot update another driver's route ─────────────────

  it("driver cannot update another driver's route", async () => {
    const driver2 = await createTestUser('driver');
    try {
      const { data: route } = await adminClient
        .from('routes')
        .insert({ ...TEST_ROUTE, driver_id: driver2.userId, status: 'active' })
        .select('id')
        .single();
      routeIds.push(route!.id);

      const { error } = await driver.client
        .from('routes')
        .update({ notes: 'hacked' })
        .eq('id', route!.id);

      // Should either error or update 0 rows (RLS filters the row)
      const { data: check } = await adminClient
        .from('routes')
        .select('notes')
        .eq('id', route!.id)
        .single();

      expect(check!.notes).not.toBe('hacked');
    } finally {
      await cleanupUser(driver2.userId).catch(() => {});
    }
  });
});
