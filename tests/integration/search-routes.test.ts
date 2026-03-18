/**
 * tests/integration/search-routes.test.ts
 *
 * Tests the route search queries used by the sender home screen and
 * the routes/results screen against a real local Supabase instance.
 *
 * Run: npx vitest run tests/integration/search-routes.test.ts
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

const SKIP = process.env.SKIP_INTEGRATION === 'true';

// ─── Helper: perform the same query the results screen uses ──────────────────

async function searchRoutes(
  client: typeof adminClient,
  params: {
    originCity: string;
    destinationCity: string;
    minWeightKg?: number;
    maxPriceEur?: number;
    departureAfter?: string;
  }
) {
  let query = (client as typeof adminClient)
    .from('routes')
    .select('id, origin_city, destination_city, status, available_weight_kg, price_per_kg_eur, departure_date')
    .eq('status', 'active')
    .eq('origin_city', params.originCity)
    .eq('destination_city', params.destinationCity);

  if (params.minWeightKg !== undefined) {
    query = query.gte('available_weight_kg', params.minWeightKg);
  }
  if (params.maxPriceEur !== undefined) {
    query = query.lte('price_per_kg_eur', params.maxPriceEur);
  }
  if (params.departureAfter !== undefined) {
    query = query.gte('departure_date', params.departureAfter);
  }

  return query;
}

describe.skipIf(SKIP)('Route search (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  const routeIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');

    // Seed a known active route for all search tests
    const { data } = await adminClient
      .from('routes')
      .insert({
        ...TEST_ROUTE,
        driver_id: driver.userId,
        status: 'active',
        departure_date: '2026-07-01',
        available_weight_kg: 30,
        price_per_kg_eur: 8,
      })
      .select('id')
      .single();
    routeIds.push(data!.id);
  });

  afterAll(async () => {
    for (const id of routeIds) await cleanupRoute(id).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── 1. Happy path ────────────────────────────────────────────────────────

  it('finds active routes for a matching origin+destination', async () => {
    const { data, error } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
    });

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.every((r) => r.status === 'active')).toBe(true);
    expect(data!.every((r) => r.origin_city === 'Berlin')).toBe(true);
    expect(data!.every((r) => r.destination_city === 'Tunis')).toBe(true);
  });

  // ── 2. No results for wrong city pair ────────────────────────────────────

  it('returns empty results for a non-existent city pair', async () => {
    const { data, error } = await searchRoutes(sender.client, {
      originCity: 'Paris',
      destinationCity: 'Tunis',
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── 3. Weight filter ──────────────────────────────────────────────────────

  it('filters out routes with insufficient available weight', async () => {
    // Route has 30kg — requesting 50kg should return nothing
    const { data: noResult } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      minWeightKg: 50,
    });
    expect(noResult!.filter((r) => r.available_weight_kg < 50)).toHaveLength(0);

    // Requesting 10kg should find it
    const { data: found } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      minWeightKg: 10,
    });
    expect(found!.length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Price filter ───────────────────────────────────────────────────────

  it('filters out routes priced above maxPriceEur', async () => {
    // Route is 8 EUR/kg — max 7 should return nothing from our seed
    const { data: noResult } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      maxPriceEur: 7,
    });
    expect(noResult!.every((r) => r.price_per_kg_eur <= 7)).toBe(true);

    // Max 10 should include our 8 EUR/kg route
    const { data: found } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      maxPriceEur: 10,
    });
    expect(found!.some((r) => r.price_per_kg_eur === 8)).toBe(true);
  });

  // ── 5. Departure date filter ──────────────────────────────────────────────

  it('filters routes departing before the requested date', async () => {
    // Route departs 2026-07-01 — searching after 2026-08-01 finds nothing
    const { data: noResult } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      departureAfter: '2026-08-01',
    });
    expect(noResult!.every((r) => r.departure_date >= '2026-08-01')).toBe(true);

    // Searching after 2026-06-01 should include July route
    const { data: found } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
      departureAfter: '2026-06-01',
    });
    expect(found!.some((r) => r.departure_date === '2026-07-01')).toBe(true);
  });

  // ── 6. Draft routes are excluded ─────────────────────────────────────────

  it('does not return draft routes', async () => {
    const { data: draft } = await adminClient
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'draft' })
      .select('id')
      .single();
    routeIds.push(draft!.id);

    const { data } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
    });

    expect(data!.every((r) => r.status === 'active')).toBe(true);
    expect(data!.find((r) => r.id === draft!.id)).toBeUndefined();
  });

  // ── 7. Full routes are excluded ───────────────────────────────────────────

  it('does not return full routes', async () => {
    const { data: full } = await adminClient
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'full' })
      .select('id')
      .single();
    routeIds.push(full!.id);

    const { data } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
    });

    expect(data!.find((r) => r.id === full!.id)).toBeUndefined();
  });

  // ── 8. Cancelled routes are excluded ────────────────────────────────────

  it('does not return cancelled routes', async () => {
    const { data: cancelled } = await adminClient
      .from('routes')
      .insert({ ...TEST_ROUTE, driver_id: driver.userId, status: 'cancelled' })
      .select('id')
      .single();
    routeIds.push(cancelled!.id);

    const { data } = await searchRoutes(sender.client, {
      originCity: 'Berlin',
      destinationCity: 'Tunis',
    });

    expect(data!.find((r) => r.id === cancelled!.id)).toBeUndefined();
  });

  // ── 9. Featured routes query (home screen) ────────────────────────────────

  it('featured routes query returns only active routes limited to 6', async () => {
    const { data, error } = await sender.client
      .from('routes')
      .select('id, origin_city, destination_city, departure_date, available_weight_kg, price_per_kg_eur, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(6);
    expect(data!.every((r) => r.status === 'active')).toBe(true);
  });
});
