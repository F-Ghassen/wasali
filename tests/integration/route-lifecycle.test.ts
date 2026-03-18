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
  TEST_ROUTE,
  type TestUser,
} from '../helpers';

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
        stop_type: 'collection',
        is_pickup_available: true,
        is_dropoff_available: false,
      },
      {
        route_id: routeId,
        city: 'Tunis',
        country: 'TN',
        stop_order: 2,
        stop_type: 'dropoff',
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
