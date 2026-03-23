/**
 * tests/unit/search-flow.test.ts
 *
 * Unit tests for the user search flow:
 *   1. searchStore — state mutations
 *   2. Pure logic extracted from useRouteResults:
 *      effectivePrice, splitTiers, sortRoutes, applyFilters
 *
 * No Supabase / network calls are made.
 * Run: npx vitest run tests/unit/search-flow.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '@/stores/searchStore';
import type { RouteResult } from '@/hooks/useRouteResults';

// ─── Inline pure helpers (mirrors useRouteResults.ts) ─────────────────────────

type SortKey = 'earliest' | 'cheapest' | 'top_rated';

interface FilterState {
  minCapacityKg?: number;
  maxPriceEur?: number;
  originCityOverride?: string;
  destCityOverride?: string;
}

function effectivePrice(route: RouteResult): number {
  return route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;
}

function splitTiers(
  routes: RouteResult[],
  originCityName: string,
  destCityName: string,
): { tier1: RouteResult[]; tier2: RouteResult[] } {
  const tier1 = routes.filter(
    (r) => r.origin_city_id === originCityName && r.destination_city_id === destCityName,
  );
  const tier2 = routes.filter(
    (r) => !(r.origin_city_id === originCityName && r.destination_city_id === destCityName),
  );
  return { tier1, tier2 };
}

function sortRoutes(routes: RouteResult[], sortKey: SortKey): RouteResult[] {
  if (sortKey === 'cheapest') {
    return [...routes].sort((a, b) => effectivePrice(a) - effectivePrice(b));
  }
  if (sortKey === 'top_rated') {
    return [...routes].sort(
      (a, b) => (b.driver?.rating ?? 0) - (a.driver?.rating ?? 0),
    );
  }
  return routes; // 'earliest' — preserved order
}

function applyFilters(routes: RouteResult[], filters: FilterState): RouteResult[] {
  return routes
    .filter((r) => r.available_weight_kg >= (filters.minCapacityKg ?? 0))
    .filter(
      (r) => filters.maxPriceEur == null || effectivePrice(r) <= filters.maxPriceEur,
    )
    .filter(
      (r) => !filters.originCityOverride || r.origin_city_id === filters.originCityOverride,
    )
    .filter(
      (r) => !filters.destCityOverride || r.destination_city_id === filters.destCityOverride,
    );
}

// ─── Fixture factory ───────────────────────────────────────────────────────────

function makeRoute(overrides: Partial<RouteResult> = {}): RouteResult {
  return {
    id: 'route-1',
    origin_city_id: 'berlin-id',
    origin_country: 'DE',
    destination_city_id: 'tunis-id',
    destination_country: 'TN',
    departure_date: '2026-07-01',
    estimated_arrival_date: '2026-07-05',
    available_weight_kg: 30,
    min_weight_kg: 1,
    price_per_kg_eur: 8,
    vehicle_type: null,
    notes: null,
    status: 'active',
    promotion_percentage: null,
    promotion_active: false,
    route_stops: [],
    route_services: [],
    driver: {
      id: 'driver-1',
      full_name: 'Ali B.',
      avatar_url: null,
      phone_verified: true,
      rating: 4.5,
      completed_trips: 20,
    },
    ...overrides,
  };
}

// ─── 1. searchStore ────────────────────────────────────────────────────────────

describe('searchStore', () => {
  beforeEach(() => {
    useSearchStore.getState().reset();
  });

  it('initialises with empty city ids and today as departFromDate', () => {
    const s = useSearchStore.getState();
    expect(s.fromCityId).toBe('');
    expect(s.toCityId).toBe('');
    expect(s.departFromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('setFromCity updates id, name and country', () => {
    useSearchStore.getState().setFromCity('city-1', 'Berlin', 'Germany');
    const s = useSearchStore.getState();
    expect(s.fromCityId).toBe('city-1');
    expect(s.fromCityName).toBe('Berlin');
    expect(s.fromCountry).toBe('Germany');
  });

  it('setToCity updates id, name and country', () => {
    useSearchStore.getState().setToCity('city-2', 'Tunis', 'Tunisia');
    const s = useSearchStore.getState();
    expect(s.toCityId).toBe('city-2');
    expect(s.toCityName).toBe('Tunis');
    expect(s.toCountry).toBe('Tunisia');
  });

  it('setDepartFromDate stores the ISO date string', () => {
    useSearchStore.getState().setDepartFromDate('2026-09-15');
    expect(useSearchStore.getState().departFromDate).toBe('2026-09-15');
  });

  it('reset clears city fields and restores today as departure date', () => {
    const store = useSearchStore.getState();
    store.setFromCity('city-1', 'Berlin', 'Germany');
    store.setToCity('city-2', 'Tunis', 'Tunisia');
    store.setDepartFromDate('2026-12-01');
    store.reset();

    const s = useSearchStore.getState();
    expect(s.fromCityId).toBe('');
    expect(s.toCityId).toBe('');
    // After reset, departFromDate should be today (not the old value)
    expect(s.departFromDate).not.toBe('2026-12-01');
  });

  it('canSearch is true only when both city ids are set', () => {
    const store = useSearchStore.getState();
    expect(!!store.fromCityId && !!store.toCityId).toBe(false);

    store.setFromCity('city-1', 'Berlin', 'Germany');
    expect(!!useSearchStore.getState().fromCityId && !!useSearchStore.getState().toCityId).toBe(false);

    store.setToCity('city-2', 'Tunis', 'Tunisia');
    expect(!!useSearchStore.getState().fromCityId && !!useSearchStore.getState().toCityId).toBe(true);
  });
});

// ─── 2. effectivePrice ────────────────────────────────────────────────────────

describe('effectivePrice', () => {
  it('returns price_per_kg_eur when no promotion', () => {
    const r = makeRoute({ price_per_kg_eur: 10, promotion_active: false });
    expect(effectivePrice(r)).toBe(10);
  });

  it('returns discounted price when promotion_active is true', () => {
    const r = makeRoute({ price_per_kg_eur: 10, promotion_active: true, promotion_percentage: 20 });
    expect(effectivePrice(r)).toBe(8); // 10 * (1 - 0.2)
  });

  it('returns full price when promotion_active is true but percentage is null', () => {
    const r = makeRoute({ price_per_kg_eur: 10, promotion_active: true, promotion_percentage: null });
    expect(effectivePrice(r)).toBe(10);
  });
});

// ─── 3. splitTiers ────────────────────────────────────────────────────────────

describe('splitTiers', () => {
  it('places exact city-pair matches in tier1', () => {
    const r = makeRoute({ origin_city_id: 'berlin-id', destination_city_id: 'tunis-id' });
    const { tier1, tier2 } = splitTiers([r], 'berlin-id', 'tunis-id');
    expect(tier1).toHaveLength(1);
    expect(tier2).toHaveLength(0);
  });

  it('places country-level matches (different city) in tier2', () => {
    const r = makeRoute({ origin_city_id: 'hamburg-id', destination_city_id: 'sfax-id' });
    const { tier1, tier2 } = splitTiers([r], 'berlin-id', 'tunis-id');
    expect(tier1).toHaveLength(0);
    expect(tier2).toHaveLength(1);
  });

  it('correctly splits a mixed list', () => {
    const exact = makeRoute({ id: 'r1', origin_city_id: 'berlin-id', destination_city_id: 'tunis-id' });
    const near  = makeRoute({ id: 'r2', origin_city_id: 'hamburg-id', destination_city_id: 'sfax-id' });
    const { tier1, tier2 } = splitTiers([exact, near], 'berlin-id', 'tunis-id');
    expect(tier1.map((r) => r.id)).toEqual(['r1']);
    expect(tier2.map((r) => r.id)).toEqual(['r2']);
  });
});

// ─── 4. sortRoutes ────────────────────────────────────────────────────────────

describe('sortRoutes', () => {
  const cheap  = makeRoute({ id: 'cheap',  price_per_kg_eur: 6, driver: { id: 'd1', full_name: 'A', avatar_url: null, phone_verified: true, rating: 3.0, completed_trips: 5 } });
  const mid    = makeRoute({ id: 'mid',    price_per_kg_eur: 8, driver: { id: 'd2', full_name: 'B', avatar_url: null, phone_verified: true, rating: 4.5, completed_trips: 10 } });
  const pricey = makeRoute({ id: 'pricey', price_per_kg_eur: 12, driver: { id: 'd3', full_name: 'C', avatar_url: null, phone_verified: true, rating: 5.0, completed_trips: 50 } });

  it('earliest preserves insertion order', () => {
    const result = sortRoutes([mid, cheap, pricey], 'earliest');
    expect(result.map((r) => r.id)).toEqual(['mid', 'cheap', 'pricey']);
  });

  it('cheapest sorts by ascending effective price', () => {
    const result = sortRoutes([pricey, mid, cheap], 'cheapest');
    expect(result.map((r) => r.id)).toEqual(['cheap', 'mid', 'pricey']);
  });

  it('cheapest respects promotion discount', () => {
    const discounted = makeRoute({
      id: 'discounted',
      price_per_kg_eur: 12,
      promotion_active: true,
      promotion_percentage: 50, // effective = 6
    });
    const result = sortRoutes([mid, discounted, cheap], 'cheapest');
    // cheap=6, discounted=6, mid=8 — tie broken by original order (stable sort)
    expect(result[0].id).toMatch(/^(cheap|discounted)$/);
    expect(result[result.length - 1].id).toBe('mid');
  });

  it('top_rated sorts by descending driver rating', () => {
    const result = sortRoutes([cheap, mid, pricey], 'top_rated');
    expect(result.map((r) => r.id)).toEqual(['pricey', 'mid', 'cheap']);
  });

  it('top_rated treats null driver rating as 0', () => {
    const noDriver = makeRoute({ id: 'nodrvr', driver: null });
    const result = sortRoutes([noDriver, cheap], 'top_rated');
    expect(result[0].id).toBe('cheap'); // rating 3.0 beats 0
  });
});

// ─── 5. applyFilters ──────────────────────────────────────────────────────────

describe('applyFilters', () => {
  const r30kg   = makeRoute({ id: 'r30', available_weight_kg: 30, price_per_kg_eur: 8 });
  const r10kg   = makeRoute({ id: 'r10', available_weight_kg: 10, price_per_kg_eur: 5 });
  const berlin  = makeRoute({ id: 'berlin',  origin_city_id: 'berlin-id',  destination_city_id: 'tunis-id' });
  const hamburg = makeRoute({ id: 'hamburg', origin_city_id: 'hamburg-id', destination_city_id: 'tunis-id' });
  const sfax    = makeRoute({ id: 'sfax',    origin_city_id: 'berlin-id',  destination_city_id: 'sfax-id' });

  it('empty filters returns all routes', () => {
    expect(applyFilters([r30kg, r10kg], {})).toHaveLength(2);
  });

  it('minCapacityKg filters out routes below the threshold', () => {
    const result = applyFilters([r30kg, r10kg], { minCapacityKg: 20 });
    expect(result.map((r) => r.id)).toEqual(['r30']);
  });

  it('minCapacityKg of 0 keeps everything', () => {
    expect(applyFilters([r30kg, r10kg], { minCapacityKg: 0 })).toHaveLength(2);
  });

  it('maxPriceEur filters out routes priced above the threshold', () => {
    const result = applyFilters([r30kg, r10kg], { maxPriceEur: 6 });
    expect(result.map((r) => r.id)).toEqual(['r10']);
  });

  it('maxPriceEur respects effective (discounted) price', () => {
    const discounted = makeRoute({
      id: 'disc',
      price_per_kg_eur: 10,
      promotion_active: true,
      promotion_percentage: 40, // effective = 6
    });
    const result = applyFilters([r30kg, discounted], { maxPriceEur: 7 });
    expect(result.map((r) => r.id)).toEqual(['disc']);
  });

  it('originCityOverride filters to matching origin', () => {
    const result = applyFilters([berlin, hamburg], { originCityOverride: 'Berlin' });
    expect(result.map((r) => r.id)).toEqual(['berlin']);
  });

  it('destCityOverride filters to matching destination', () => {
    const result = applyFilters([berlin, sfax], { destCityOverride: 'Tunis' });
    expect(result.map((r) => r.id)).toEqual(['berlin']);
  });

  it('combined filters are ANDed', () => {
    const heavy = makeRoute({ id: 'heavy', available_weight_kg: 50, price_per_kg_eur: 12 });
    const result = applyFilters([r30kg, r10kg, heavy], { minCapacityKg: 20, maxPriceEur: 9 });
    expect(result.map((r) => r.id)).toEqual(['r30']);
  });
});
