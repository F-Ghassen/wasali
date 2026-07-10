/**
 * tests/integration/search-routes.test.ts
 *
 * Integration tests for the sender route-search flow against a live local
 * Supabase instance. Tests verify the full query + in-memory tier split that
 * useRouteResults() performs.
 *
 * Prerequisites:
 *   supabase start          # start local stack
 *   supabase db push        # apply migrations + seed
 *
 * Run:
 *   npx vitest run tests/integration/search-routes.test.ts
 *
 * Skip when Supabase is not running:
 *   SKIP_INTEGRATION=true npx vitest run tests/integration/search-routes.test.ts
 *
 * ─── Search tiering model ────────────────────────────────────────────────────
 *
 * Searching Berlin → Tunis fetches all Germany → Tunisia active routes, then
 * splits them into two display tiers:
 *
 *   tier1  Routes where a collection stop = Berlin AND a dropoff stop = Tunis.
 *          Shown first as "Best matches".
 *
 *   tier2  Germany → Tunisia routes with a different origin or destination city
 *          (Hamburg → Sfax, Munich → Sousse, etc.).
 *          Shown below as "Other routes in region".
 *
 * The split is done entirely in-memory by splitTiers() after the DB fetch.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createTestUser, cleanupUser, cleanupRoute, type TestUser } from '../helpers';
import { STOP_TYPE } from '@/constants/stopTypes';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

// ─── Helper: look up a city id by name ───────────────────────────────────────

async function getCityId(name: string): Promise<string> {
  const { data, error } = await adminClient
    .from('cities')
    .select('id')
    .eq('name', name)
    .single();
  if (error || !data) throw new Error(`City not found: ${name} (${error?.message})`);
  return data.id;
}

// ─── Helper: seed a route with explicit stops ─────────────────────────────────

interface StopSpec { cityId: string; type: 'collection' | 'dropoff'; order: number }

async function seedRouteWithStops(
  driverId: string,
  stops: StopSpec[],
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { data: route, error: routeError } = await adminClient
    .from('routes')
    .insert({
      driver_id: driverId,
      departure_date: '2026-07-06',
      estimated_arrival_date: '2026-07-10',
      available_weight_kg: 30,
      min_weight_kg: 1,
      price_per_kg_eur: 8,
      status: 'active',
      notes: 'integration test route',
      ...overrides,
    })
    .select('id')
    .single();
  if (routeError || !route) throw new Error(`seedRoute failed: ${routeError?.message}`);

  const stopsPayload = stops.map((s) => ({
    route_id: route.id,
    city_id: s.cityId,
    stop_type: s.type,
    stop_order: s.order,
    is_pickup_available: s.type === 'collection',
    is_dropoff_available: s.type === 'dropoff',
  }));

  const { error: stopsError } = await adminClient.from('route_stops').insert(stopsPayload);
  if (stopsError) throw new Error(`seedStops failed: ${stopsError.message}`);

  return route.id;
}

// ─── Helper: perform the same DB query as useRouteResults ────────────────────

async function fetchActiveRoutes(dateFloor: string) {
  const { data, error } = await adminClient
    .from('routes')
    .select(`
      id, departure_date, status, available_weight_kg, price_per_kg_eur,
      route_stops(id, city_id, stop_type, stop_order, is_pickup_available, is_dropoff_available)
    `)
    .eq('status', 'active')
    .gt('available_weight_kg', 0)
    .or(`departure_date.gte.${dateFloor},departure_date.is.null`)
    .order('departure_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

// ─── In-memory helpers (mirrors useRouteResults.ts) ──────────────────────────

type Stop = { city_id: string; stop_type: string };

function filterByCountry(
  routes: { route_stops: Stop[] }[],
  cityIds: string[],
  stopType: string,
) {
  return routes.filter((r) =>
    r.route_stops.some((s) => s.stop_type === stopType && cityIds.includes(s.city_id)),
  );
}

function isExactMatch(
  route: { route_stops: Stop[] },
  originCityId: string,
  destCityId: string,
) {
  const hasOrigin = route.route_stops.some(
    (s) => s.stop_type === STOP_TYPE.COLLECTION && s.city_id === originCityId,
  );
  const hasDest = route.route_stops.some(
    (s) => s.stop_type === STOP_TYPE.DROPOFF && s.city_id === destCityId,
  );
  return hasOrigin && hasDest;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe.skipIf(SKIP)('Route search — Berlin→Tunis tiering (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  const routeIds: string[] = [];

  // city ids resolved once from DB
  let BERLIN: string;
  let HAMBURG: string;
  let MUNICH: string;
  let FRANKFURT: string;
  let TUNIS: string;
  let SFAX: string;
  let SOUSSE: string;

  beforeAll(async () => {
    [BERLIN, HAMBURG, MUNICH, FRANKFURT, TUNIS, SFAX, SOUSSE] = await Promise.all([
      getCityId('Berlin'),
      getCityId('Hamburg'),
      getCityId('Munich'),
      getCityId('Frankfurt'),
      getCityId('Tunis'),
      getCityId('Sfax'),
      getCityId('Sousse'),
    ]);

    driver = await createTestUser('driver');
    sender = await createTestUser('sender');

    // ── tier1 routes ──────────────────────────────────────────────────────────
    // 1. Berlin → Tunis (exact match — must be in tier1)
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ]));

    // 2. Multi-stop: Frankfurt + Berlin → Tunis (Berlin is 2nd stop — still tier1)
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: FRANKFURT, type: 'collection', order: 0 },
      { cityId: BERLIN,    type: 'collection', order: 1 },
      { cityId: TUNIS,     type: 'dropoff',    order: 2 },
    ]));

    // ── tier2 routes ──────────────────────────────────────────────────────────
    // 3. Hamburg → Sfax
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: HAMBURG, type: 'collection', order: 0 },
      { cityId: SFAX,    type: 'dropoff',    order: 1 },
    ]));

    // 4. Munich → Sousse
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: MUNICH,  type: 'collection', order: 0 },
      { cityId: SOUSSE,  type: 'dropoff',    order: 1 },
    ]));

    // 5. Frankfurt → Tunis (right destination, wrong origin)
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: FRANKFURT, type: 'collection', order: 0 },
      { cityId: TUNIS,     type: 'dropoff',    order: 1 },
    ]));

    // 6. Hamburg → Tunis (right destination, wrong origin)
    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: HAMBURG, type: 'collection', order: 0 },
      { cityId: TUNIS,   type: 'dropoff',    order: 1 },
    ]));
  });

  afterAll(async () => {
    for (const id of routeIds) await cleanupRoute(id).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── 1. Happy path: Berlin→Tunis exact matches ─────────────────────────────

  it('tier1 contains only routes with a Berlin collection stop AND Tunis dropoff stop', async () => {
    const all = await fetchActiveRoutes('2026-07-01');
    const seeded = all.filter((r) => routeIds.includes(r.id));

    const tier1 = seeded.filter((r) => isExactMatch(r, BERLIN, TUNIS));

    // Both seeded tier1 routes must appear
    const tier1Ids = tier1.map((r) => r.id);
    expect(tier1Ids).toContain(routeIds[0]); // Berlin→Tunis
    expect(tier1Ids).toContain(routeIds[1]); // Frankfurt+Berlin→Tunis

    // None of the tier2 routes should be in tier1
    expect(tier1Ids).not.toContain(routeIds[2]); // Hamburg→Sfax
    expect(tier1Ids).not.toContain(routeIds[3]); // Munich→Sousse
    expect(tier1Ids).not.toContain(routeIds[4]); // Frankfurt→Tunis
    expect(tier1Ids).not.toContain(routeIds[5]); // Hamburg→Tunis
  });

  it('tier2 contains same-corridor routes with a different origin or destination', async () => {
    const all = await fetchActiveRoutes('2026-07-01');
    const seeded = all.filter((r) => routeIds.includes(r.id));

    const tier2 = seeded.filter((r) => !isExactMatch(r, BERLIN, TUNIS));
    const tier2Ids = tier2.map((r) => r.id);

    expect(tier2Ids).toContain(routeIds[2]); // Hamburg→Sfax
    expect(tier2Ids).toContain(routeIds[3]); // Munich→Sousse
    expect(tier2Ids).toContain(routeIds[4]); // Frankfurt→Tunis
    expect(tier2Ids).toContain(routeIds[5]); // Hamburg→Tunis

    // Exact Berlin→Tunis routes must NOT appear in tier2
    expect(tier2Ids).not.toContain(routeIds[0]);
    expect(tier2Ids).not.toContain(routeIds[1]);
  });

  it('multi-stop route (Frankfurt+Berlin collection → Tunis) lands in tier1', async () => {
    const all = await fetchActiveRoutes('2026-07-01');
    const multiStop = all.find((r) => r.id === routeIds[1]);
    expect(multiStop).toBeDefined();
    expect(isExactMatch(multiStop!, BERLIN, TUNIS)).toBe(true);
  });

  // ── 2. Date filter ────────────────────────────────────────────────────────

  it('departure date floor excludes routes departing before the date', async () => {
    // seeded routes depart 2026-07-06; floor of 2026-08-01 should exclude them
    const all = await fetchActiveRoutes('2026-08-01');
    const seededVisible = all.filter((r) => routeIds.includes(r.id));
    expect(seededVisible).toHaveLength(0);
  });

  it('departure date floor includes routes departing on or after the floor', async () => {
    const all = await fetchActiveRoutes('2026-07-06');
    const seededVisible = all.filter((r) => routeIds.includes(r.id));
    expect(seededVisible.length).toBeGreaterThanOrEqual(routeIds.length);
  });

  it('routes with null departure_date are always included regardless of floor', async () => {
    const nullDateRouteId = await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ], { departure_date: null });
    routeIds.push(nullDateRouteId);

    const all = await fetchActiveRoutes('2099-01-01'); // far-future floor
    const found = all.find((r) => r.id === nullDateRouteId);
    expect(found).toBeDefined();
  });

  // ── 3. Status filter ──────────────────────────────────────────────────────

  it('only active routes are returned', async () => {
    const draftId = await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ], { status: 'draft' });
    routeIds.push(draftId);

    const all = await fetchActiveRoutes('2026-07-01');
    expect(all.every((r) => r.status === 'active')).toBe(true);
    expect(all.find((r) => r.id === draftId)).toBeUndefined();
  });

  it('full routes are excluded', async () => {
    const fullId = await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ], { status: 'full' });
    routeIds.push(fullId);

    const all = await fetchActiveRoutes('2026-07-01');
    expect(all.find((r) => r.id === fullId)).toBeUndefined();
  });

  it('cancelled routes are excluded', async () => {
    const cancelledId = await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ], { status: 'cancelled' });
    routeIds.push(cancelledId);

    const all = await fetchActiveRoutes('2026-07-01');
    expect(all.find((r) => r.id === cancelledId)).toBeUndefined();
  });

  // ── 4. Capacity filter ────────────────────────────────────────────────────

  it('routes with 0 available_weight_kg are excluded', async () => {
    const fullCapId = await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN, type: 'collection', order: 0 },
      { cityId: TUNIS,  type: 'dropoff',    order: 1 },
    ], { available_weight_kg: 0 });
    routeIds.push(fullCapId);

    const all = await fetchActiveRoutes('2026-07-01');
    expect(all.find((r) => r.id === fullCapId)).toBeUndefined();
  });
});

// ─── Country-level search ──────────────────────────────────────────────────────

describe.skipIf(SKIP)('Route search — Germany→Tunisia country-level search (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  const routeIds: string[] = [];

  let BERLIN: string;
  let HAMBURG: string;
  let TUNIS: string;
  let SFAX: string;

  beforeAll(async () => {
    [BERLIN, HAMBURG, TUNIS, SFAX] = await Promise.all([
      getCityId('Berlin'),
      getCityId('Hamburg'),
      getCityId('Tunis'),
      getCityId('Sfax'),
    ]);

    driver = await createTestUser('driver');
    sender = await createTestUser('sender');

    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: BERLIN,  type: 'collection', order: 0 },
      { cityId: TUNIS,   type: 'dropoff',    order: 1 },
    ]));

    routeIds.push(await seedRouteWithStops(driver.userId, [
      { cityId: HAMBURG, type: 'collection', order: 0 },
      { cityId: SFAX,    type: 'dropoff',    order: 1 },
    ]));
  });

  afterAll(async () => {
    for (const id of routeIds) await cleanupRoute(id).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  it('country search (no originCityId) puts all matching-dest routes in tier1', async () => {
    const all = await fetchActiveRoutes('2026-07-01');
    const seeded = all.filter((r) => routeIds.includes(r.id));

    // No originCityId → isExactMatch treats hasOrigin = true for any collection stop
    const tier1 = seeded.filter((r) => {
      const hasDest = r.route_stops.some(
        (s) => s.stop_type === STOP_TYPE.DROPOFF && s.city_id === TUNIS,
      );
      return hasDest; // no origin constraint
    });
    const tier2 = seeded.filter((r) => {
      return !r.route_stops.some(
        (s) => s.stop_type === STOP_TYPE.DROPOFF && s.city_id === TUNIS,
      );
    });

    expect(tier1.map((r) => r.id)).toContain(routeIds[0]); // Berlin→Tunis → tier1
    expect(tier2.map((r) => r.id)).toContain(routeIds[1]); // Hamburg→Sfax → tier2 (no Tunis stop)
  });
});
