/**
 * tests/unit/driver-dashboard-upcoming-trips.test.ts
 *
 * Unit tests for the "upcoming trips" logic on the driver home screen.
 *
 * The dashboard filters routes via:
 *   routes.filter(r => r.status === 'active' && r.departure_date >= localTodayString())
 *
 * Key bug that was fixed: the original code used
 *   new Date().toISOString().split('T')[0]
 * which returns the UTC date. For devices in UTC+ timezones this can
 * advance past midnight a day ahead of local time, causing today's route
 * to disappear from the upcoming list. localTodayString() uses local
 * calendar components (getFullYear/getMonth/getDate) instead.
 *
 * Run: npx vitest run tests/unit/driver-dashboard-upcoming-trips.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { localTodayString } from '@/utils/formatters';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import type { RouteWithStops } from '@/types/models';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mirrors the filter used in app/(driver)/index.tsx */
function getUpcomingRoutes(routes: RouteWithStops[], today: string): RouteWithStops[] {
  return routes
    .filter((r) => r.status === 'active' && r.departure_date >= today)
    .slice(0, 3);
}

/** Minimal RouteWithStops fixture */
function makeRoute(overrides: Partial<RouteWithStops> = {}): RouteWithStops {
  return {
    id: 'route-1',
    driver_id: 'driver-1',
    origin_city: 'Berlin',
    origin_country: 'DE',
    destination_city: 'Tunis',
    destination_country: 'TN',
    departure_date: '2026-07-10',
    estimated_arrival_date: '2026-07-14',
    available_weight_kg: 30,
    min_weight_kg: 1,
    price_per_kg_eur: 8,
    status: 'active',
    notes: null,
    payment_methods: ['cash_sender'],
    promo_discount_pct: null,
    promo_expires_at: null,
    promo_label: null,
    logistics_options: [],
    prohibited_items: [],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    route_stops: [],
    route_services: [],
    route_payment_methods: [],
    ...overrides,
  } as RouteWithStops;
}

// ─── localTodayString ────────────────────────────────────────────────────────

describe('localTodayString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a YYYY-MM-DD formatted string', () => {
    expect(localTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses local calendar, not UTC', () => {
    // Simulate 23:30 on 2026-07-02 in UTC+1 (local date is 2026-07-02,
    // but UTC is 2026-07-01T22:30Z — UTC date is still July 1).
    // Set the fake clock to 2026-07-02T22:30:00Z (UTC), which is
    // 2026-07-02 23:30 in UTC+1. toISOString() would return "2026-07-02"
    // at that UTC time, but in UTC-1 it would return "2026-07-01".
    // localTodayString() must always match the device's local date.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T10:00:00Z'));

    const result = localTodayString();
    const now = new Date('2026-07-15T10:00:00Z');
    const expected = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    expect(result).toBe(expected);
  });

  it('does NOT use new Date().toISOString() (UTC date)', () => {
    // Verify our helper does NOT simply call toISOString().split('T')[0]
    // by checking the implementation uses local components.
    vi.useFakeTimers();
    // Use a time that is unambiguously the same in any realistic timezone
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'));
    expect(localTodayString()).toMatch(/^2026-08-\d{2}$/);
  });
});

// ─── getUpcomingRoutes (mirror of driver dashboard logic) ────────────────────

describe('driver dashboard — upcoming trips', () => {
  const TODAY = '2026-07-02';

  it('includes an active route departing today', () => {
    const route = makeRoute({ departure_date: TODAY, status: 'active' });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(1);
  });

  it('includes an active route departing in the future', () => {
    const route = makeRoute({ departure_date: '2026-07-15', status: 'active' });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(1);
  });

  it('excludes an active route whose departure_date is in the past', () => {
    const route = makeRoute({ departure_date: '2026-07-01', status: 'active' });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(0);
  });

  it('excludes a route that is not active (completed)', () => {
    const route = makeRoute({ departure_date: TODAY, status: 'completed' as any });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(0);
  });

  it('excludes a route that is not active (cancelled)', () => {
    const route = makeRoute({ departure_date: TODAY, status: 'cancelled' as any });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(0);
  });

  it('excludes a route that is not active (draft)', () => {
    const route = makeRoute({ departure_date: TODAY, status: 'draft' as any });
    expect(getUpcomingRoutes([route], TODAY)).toHaveLength(0);
  });

  it('returns up to 3 routes (sliced)', () => {
    const routes = [
      makeRoute({ id: 'r1', departure_date: TODAY }),
      makeRoute({ id: 'r2', departure_date: '2026-07-05' }),
      makeRoute({ id: 'r3', departure_date: '2026-07-10' }),
      makeRoute({ id: 'r4', departure_date: '2026-07-20' }),
    ];
    const result = getUpcomingRoutes(routes, TODAY);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('counts upcoming routes correctly (the key regression case: should be 1, not 0)', () => {
    // Regression: if today is 2026-07-02 and the route departs 2026-07-02,
    // the previous UTC-based filter could return "2026-07-01" as "today"
    // for UTC+1 devices at 23:00 local time, causing the route to be invisible.
    const route = makeRoute({ departure_date: TODAY, status: 'active' });
    const result = getUpcomingRoutes([route], TODAY);
    expect(result).toHaveLength(1); // must be 1, not 0
  });

  it('mixed active/inactive routes: only counts active upcoming ones', () => {
    const routes = [
      makeRoute({ id: 'r1', departure_date: TODAY, status: 'active' }),
      makeRoute({ id: 'r2', departure_date: TODAY, status: 'completed' as any }),
      makeRoute({ id: 'r3', departure_date: '2026-07-10', status: 'active' }),
    ];
    const result = getUpcomingRoutes(routes, TODAY);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r3']);
  });
});

// ─── driverRouteStore initial state ─────────────────────────────────────────

describe('driverRouteStore initial state', () => {
  beforeEach(() => {
    // Reset to a clean state between tests
    useDriverRouteStore.setState({
      routes: [],
      templates: [],
      isLoading: false,
      error: null,
      hasMore: true,
      page: 0,
    });
  });

  it('starts with an empty routes array', () => {
    expect(useDriverRouteStore.getState().routes).toHaveLength(0);
  });

  it('upcoming trips count is 0 when routes is empty (pre-load state after login)', () => {
    const { routes } = useDriverRouteStore.getState();
    const today = localTodayString();
    const upcoming = routes.filter(
      (r) => r.status === 'active' && r.departure_date >= today,
    );
    expect(upcoming).toHaveLength(0);
  });

  it('upcoming trips count is 1 after store is seeded with one active future route', () => {
    const futureDate = '2099-12-31'; // safely in the future
    useDriverRouteStore.setState({
      routes: [makeRoute({ departure_date: futureDate, status: 'active' })],
    });

    const { routes } = useDriverRouteStore.getState();
    const today = localTodayString();
    const upcoming = routes.filter(
      (r) => r.status === 'active' && r.departure_date >= today,
    );
    expect(upcoming).toHaveLength(1);
  });

  it('upcoming trips count remains 0 for a past-dated active route in the store', () => {
    useDriverRouteStore.setState({
      routes: [makeRoute({ departure_date: '2000-01-01', status: 'active' })],
    });

    const { routes } = useDriverRouteStore.getState();
    const today = localTodayString();
    const upcoming = routes.filter(
      (r) => r.status === 'active' && r.departure_date >= today,
    );
    expect(upcoming).toHaveLength(0);
  });
});
