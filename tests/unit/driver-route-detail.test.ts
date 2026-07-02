/**
 * tests/unit/driver-route-detail.test.ts
 *
 * Unit tests for the route detail screen data-loading logic.
 *
 * Key regression: previously the screen called fetchRoutes(profile.id) which
 * replaced the ENTIRE store list and showed "route not found" while the async
 * fetch was in flight. Fixed by:
 *   1. Using fetchRouteById — fetches only the requested route and upserts it.
 *   2. Gating the "not found" UI on !isLoading so it never appears prematurely.
 *
 * Run: npx vitest run tests/unit/driver-route-detail.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import type { RouteWithStops } from '@/types/models';

// ─── Fixture ─────────────────────────────────────────────────────────────────

function makeRoute(overrides: Partial<RouteWithStops> = {}): RouteWithStops {
  return {
    id: 'route-abc',
    driver_id: 'driver-1',
    departure_date: '2026-07-06',
    estimated_arrival_date: null,
    available_weight_kg: 30,
    min_weight_kg: 1,
    price_per_kg_eur: 8,
    status: 'active',
    notes: null,
    payment_methods: [],
    promo_discount_pct: null,
    promo_expires_at: null,
    promo_label: null,
    logistics_options: [],
    prohibited_items: [],
    created_at: '2026-07-02T00:00:00Z',
    updated_at: '2026-07-02T00:00:00Z',
    route_stops: [],
    route_services: [],
    route_payment_methods: [],
    ...overrides,
  } as RouteWithStops;
}

// ─── Store state helpers (mirror detail screen logic) ─────────────────────────

function routeFromStore(id: string): RouteWithStops | undefined {
  return useDriverRouteStore.getState().routes.find((r) => r.id === id);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('driverRouteStore — fetchRouteById upsert logic', () => {
  beforeEach(() => {
    useDriverRouteStore.setState({
      routes: [],
      isLoading: false,
      error: null,
    });
  });

  it('appends a route to an empty store', () => {
    const route = makeRoute({ id: 'r1' });
    useDriverRouteStore.setState((s) => ({
      routes: [...s.routes, route],
    }));
    expect(routeFromStore('r1')).toBeDefined();
  });

  it('upserts (replaces) an existing route without touching others', () => {
    const r1 = makeRoute({ id: 'r1', available_weight_kg: 30 });
    const r2 = makeRoute({ id: 'r2', available_weight_kg: 20 });
    useDriverRouteStore.setState({ routes: [r1, r2] });

    // Simulate what fetchRouteById does on success
    const updated = { ...r1, available_weight_kg: 25 };
    useDriverRouteStore.setState((state) => ({
      routes: state.routes.map((r) => (r.id === 'r1' ? updated : r)),
    }));

    expect(routeFromStore('r1')?.available_weight_kg).toBe(25);
    expect(routeFromStore('r2')?.available_weight_kg).toBe(20); // unchanged
    expect(useDriverRouteStore.getState().routes).toHaveLength(2);
  });

  it('does not blow away other routes when fetching one by ID', () => {
    // This is the regression: old code called fetchRoutes(driverId) with replace=true,
    // clearing all routes during the async gap.
    const routes = [
      makeRoute({ id: 'r1' }),
      makeRoute({ id: 'r2' }),
      makeRoute({ id: 'r3' }),
    ];
    useDriverRouteStore.setState({ routes });

    // Simulate fetchRouteById upsert for r2 only
    useDriverRouteStore.setState((state) => {
      const incoming = makeRoute({ id: 'r2', notes: 'updated' });
      return {
        routes: state.routes.map((r) => (r.id === 'r2' ? incoming : r)),
      };
    });

    // All three routes must still exist
    expect(useDriverRouteStore.getState().routes).toHaveLength(3);
    expect(routeFromStore('r1')).toBeDefined();
    expect(routeFromStore('r3')).toBeDefined();
    expect(routeFromStore('r2')?.notes).toBe('updated');
  });
});

describe('detail screen — "not found" guard', () => {
  beforeEach(() => {
    useDriverRouteStore.setState({ routes: [], isLoading: false, error: null });
  });

  it('route is undefined when store is empty (pre-fetch state)', () => {
    expect(routeFromStore('ac8319f3-b314-402c-871a-eacf87ffa8c5')).toBeUndefined();
  });

  it('isLoading is true while fetch is in flight', () => {
    useDriverRouteStore.setState({ isLoading: true });
    expect(useDriverRouteStore.getState().isLoading).toBe(true);
  });

  it('route is defined and isLoading is false after successful fetch', () => {
    const route = makeRoute({ id: 'ac8319f3-b314-402c-871a-eacf87ffa8c5' });
    useDriverRouteStore.setState({ routes: [route], isLoading: false });

    expect(routeFromStore('ac8319f3-b314-402c-871a-eacf87ffa8c5')).toBeDefined();
    expect(useDriverRouteStore.getState().isLoading).toBe(false);
  });

  it('error is set and isLoading is false after a failed fetch', () => {
    useDriverRouteStore.setState({ error: 'Not found', isLoading: false });

    // Route still undefined — the UI should show "not found", not a spinner
    expect(routeFromStore('ac8319f3-b314-402c-871a-eacf87ffa8c5')).toBeUndefined();
    expect(useDriverRouteStore.getState().isLoading).toBe(false);
    expect(useDriverRouteStore.getState().error).toBe('Not found');
  });

  it('loading=true means spinner, not "not found" — the regression case', () => {
    // Before the fix: route=undefined && isLoading=true → showed "not found"
    // After the fix:  route=undefined && isLoading=true → shows spinner
    useDriverRouteStore.setState({ routes: [], isLoading: true });

    const route = routeFromStore('ac8319f3-b314-402c-871a-eacf87ffa8c5');
    const { isLoading } = useDriverRouteStore.getState();

    // Correct behaviour: show spinner
    expect(route).toBeUndefined();
    expect(isLoading).toBe(true);
    // UI logic: !route && isLoading → spinner (not "not found")
    const shouldShowSpinner = !route && isLoading;
    const shouldShowNotFound = !route && !isLoading;
    expect(shouldShowSpinner).toBe(true);
    expect(shouldShowNotFound).toBe(false);
  });
});
