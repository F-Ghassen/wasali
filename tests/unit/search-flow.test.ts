/**
 * tests/unit/search-flow.test.ts
 *
 * Unit tests for the sender route-search flow.
 *
 * Coverage:
 *   1. searchStore          — state mutations
 *   2. effectivePrice       — promotion discount logic
 *   3. splitTiers           — tier1 (exact city match) vs tier2 (country corridor)
 *   4. sortRoutes           — earliest / cheapest / top_rated
 *   5. applyFilters         — capacity, price, city override filters
 *
 * All helpers are re-implemented inline (pure functions, no network).
 * Run: npx vitest run tests/unit/search-flow.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '@/stores/searchStore';
import type { RouteResult } from '@/hooks/useRouteResults';
import { STOP_TYPE } from '@/constants/stopTypes';
import { effectivePrice, splitTiers, sortRoutes, applyFilters } from '@/utils/routeSearch';
import { toNumericString, parseFilterNumber } from '@/utils/filterInput';

// ─── Fixture factories ────────────────────────────────────────────────────────

function makeStop(
  cityId: string,
  stopType: typeof STOP_TYPE.COLLECTION | typeof STOP_TYPE.DROPOFF,
  order = 0,
) {
  return {
    id: `stop-${cityId}-${stopType}`,
    city_id: cityId,
    route_id: 'route-x',
    stop_order: order,
    stop_type: stopType,
    is_pickup_available: stopType === STOP_TYPE.COLLECTION,
    is_dropoff_available: stopType === STOP_TYPE.DROPOFF,
    arrival_date: null,
    meeting_point_url: null,
    location_name: null,
    location_address: null,
  };
}

function makeRoute(overrides: Partial<RouteResult> & { id: string }): RouteResult {
  return {
    departure_date: '2026-07-06',
    estimated_arrival_date: '2026-07-10',
    available_weight_kg: 30,
    min_weight_kg: 1,
    price_per_kg_eur: 8,
    vehicle_type: null,
    notes: null,
    status: 'active',
    promotion_percentage: null,
    promotion_active: false,
    origin_city_id: null,
    destination_city_id: null,
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

// ─── City / corridor constants ────────────────────────────────────────────────

const BERLIN  = 'city-berlin';
const HAMBURG = 'city-hamburg';
const MUNICH  = 'city-munich';
const FRANKFURT = 'city-frankfurt';
const TUNIS   = 'city-tunis';
const SFAX    = 'city-sfax';
const SOUSSE  = 'city-sousse';

// ─── 1. searchStore ────────────────────────────────────────────────────────────

describe('searchStore', () => {
  beforeEach(() => {
    useSearchStore.getState().reset();
  });

  it('initialises with empty city ids and null departFromDate (any date)', () => {
    const s = useSearchStore.getState();
    expect(s.fromCityId).toBe('');
    expect(s.toCityId).toBe('');
    expect(s.departFromDate).toBeNull();
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

  it('setDepartFromDate accepts null to clear the date filter', () => {
    useSearchStore.getState().setDepartFromDate('2026-09-15');
    useSearchStore.getState().setDepartFromDate(null);
    expect(useSearchStore.getState().departFromDate).toBeNull();
  });

  it('reset clears all fields and restores departFromDate to null', () => {
    const store = useSearchStore.getState();
    store.setFromCity('city-1', 'Berlin', 'Germany');
    store.setToCity('city-2', 'Tunis', 'Tunisia');
    store.setDepartFromDate('2026-12-01');
    store.reset();

    const s = useSearchStore.getState();
    expect(s.fromCityId).toBe('');
    expect(s.toCityId).toBe('');
    expect(s.departFromDate).toBeNull();
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
    const r = makeRoute({ id: 'r', price_per_kg_eur: 10, promotion_active: false });
    expect(effectivePrice(r)).toBe(10);
  });

  it('returns discounted price when promotion_active is true', () => {
    const r = makeRoute({ id: 'r', price_per_kg_eur: 10, promotion_active: true, promotion_percentage: 20 });
    expect(effectivePrice(r)).toBe(8); // 10 * (1 - 0.2)
  });

  it('returns full price when promotion_active but percentage is null', () => {
    const r = makeRoute({ id: 'r', price_per_kg_eur: 10, promotion_active: true, promotion_percentage: null });
    expect(effectivePrice(r)).toBe(10);
  });
});

// ─── 3. splitTiers — Berlin→Tunis scenario ────────────────────────────────────
//
// Search: Berlin (origin city) → Tunis (destination city)
//
// Fetch returns all Germany→Tunisia routes (country-level filter).
// splitTiers() must then separate:
//   tier1 — routes that have Berlin as a collection stop AND Tunis as a dropoff stop
//   tier2 — same Germany→Tunisia corridor but different cities
//            (Hamburg→Sfax, Munich→Sousse, Frankfurt→Tunis, etc.)

describe('splitTiers — Berlin→Tunis', () => {
  // tier1 candidates
  const berlinTunis = makeRoute({
    id: 'berlin-tunis',
    origin_city_id: BERLIN,
    destination_city_id: TUNIS,
    route_stops: [
      makeStop(BERLIN, STOP_TYPE.COLLECTION, 0),
      makeStop(TUNIS,  STOP_TYPE.DROPOFF,    1),
    ],
  });

  // Multi-stop route: Berlin + Frankfurt collection, Tunis dropoff — still tier1
  const multiStopBerlinTunis = makeRoute({
    id: 'multi-berlin-tunis',
    route_stops: [
      makeStop(FRANKFURT, STOP_TYPE.COLLECTION, 0),
      makeStop(BERLIN,    STOP_TYPE.COLLECTION, 1), // Berlin is 2nd stop
      makeStop(TUNIS,     STOP_TYPE.DROPOFF,    2),
    ],
  });

  // tier2 candidates — same corridor, different cities
  const hamburgSfax = makeRoute({
    id: 'hamburg-sfax',
    origin_city_id: HAMBURG,
    destination_city_id: SFAX,
    route_stops: [
      makeStop(HAMBURG, STOP_TYPE.COLLECTION, 0),
      makeStop(SFAX,    STOP_TYPE.DROPOFF,    1),
    ],
  });

  const munichSousse = makeRoute({
    id: 'munich-sousse',
    origin_city_id: MUNICH,
    destination_city_id: SOUSSE,
    route_stops: [
      makeStop(MUNICH,  STOP_TYPE.COLLECTION, 0),
      makeStop(SOUSSE,  STOP_TYPE.DROPOFF,    1),
    ],
  });

  const frankfurtTunis = makeRoute({
    id: 'frankfurt-tunis',
    origin_city_id: FRANKFURT,
    destination_city_id: TUNIS,
    route_stops: [
      makeStop(FRANKFURT, STOP_TYPE.COLLECTION, 0),
      makeStop(TUNIS,     STOP_TYPE.DROPOFF,    1),
    ],
  });

  const hamburgTunis = makeRoute({
    id: 'hamburg-tunis',
    origin_city_id: HAMBURG,
    destination_city_id: TUNIS,
    route_stops: [
      makeStop(HAMBURG, STOP_TYPE.COLLECTION, 0),
      makeStop(TUNIS,   STOP_TYPE.DROPOFF,    1),
    ],
  });

  it('places Berlin→Tunis in tier1', () => {
    const { tier1, tier2 } = splitTiers([berlinTunis], BERLIN, TUNIS);
    expect(tier1.map((r) => r.id)).toEqual(['berlin-tunis']);
    expect(tier2).toHaveLength(0);
  });

  it('places Hamburg→Sfax in tier2', () => {
    const { tier1, tier2 } = splitTiers([hamburgSfax], BERLIN, TUNIS);
    expect(tier1).toHaveLength(0);
    expect(tier2.map((r) => r.id)).toEqual(['hamburg-sfax']);
  });

  it('places Frankfurt→Tunis in tier2 (right dest, wrong origin)', () => {
    const { tier1, tier2 } = splitTiers([frankfurtTunis], BERLIN, TUNIS);
    expect(tier1).toHaveLength(0);
    expect(tier2.map((r) => r.id)).toEqual(['frankfurt-tunis']);
  });

  it('places Hamburg→Tunis in tier2 (right dest, wrong origin)', () => {
    const { tier1, tier2 } = splitTiers([hamburgTunis], BERLIN, TUNIS);
    expect(tier1).toHaveLength(0);
    expect(tier2.map((r) => r.id)).toEqual(['hamburg-tunis']);
  });

  it('multi-stop route with Berlin as 2nd collection stop lands in tier1', () => {
    const { tier1, tier2 } = splitTiers([multiStopBerlinTunis], BERLIN, TUNIS);
    expect(tier1.map((r) => r.id)).toEqual(['multi-berlin-tunis']);
    expect(tier2).toHaveLength(0);
  });

  it('correctly splits a full Germany→Tunisia result set', () => {
    const allRoutes = [
      berlinTunis,
      multiStopBerlinTunis,
      hamburgSfax,
      munichSousse,
      frankfurtTunis,
      hamburgTunis,
    ];

    const { tier1, tier2 } = splitTiers(allRoutes, BERLIN, TUNIS);

    expect(tier1.map((r) => r.id).sort()).toEqual([
      'berlin-tunis',
      'multi-berlin-tunis',
    ].sort());

    expect(tier2.map((r) => r.id).sort()).toEqual([
      'frankfurt-tunis',
      'hamburg-sfax',
      'hamburg-tunis',
      'munich-sousse',
    ].sort());
  });

  it('when no originCityId is given, all routes with Tunis dropoff land in tier1', () => {
    // Country-only search: Germany → Tunis
    const allRoutes = [berlinTunis, frankfurtTunis, hamburgTunis, hamburgSfax];
    const { tier1, tier2 } = splitTiers(allRoutes, undefined, TUNIS);

    expect(tier1.map((r) => r.id).sort()).toEqual([
      'berlin-tunis',
      'frankfurt-tunis',
      'hamburg-tunis',
    ].sort());
    expect(tier2.map((r) => r.id)).toEqual(['hamburg-sfax']);
  });

  it('when no destCityId is given, all routes land in tier1 (no tier2)', () => {
    const { tier1, tier2 } = splitTiers([berlinTunis, hamburgSfax], BERLIN, undefined);
    expect(tier1).toHaveLength(2);
    expect(tier2).toHaveLength(0);
  });

  it('returns empty tier1 and tier2 for an empty route list', () => {
    const { tier1, tier2 } = splitTiers([], BERLIN, TUNIS);
    expect(tier1).toHaveLength(0);
    expect(tier2).toHaveLength(0);
  });
});

// ─── 4. sortRoutes ────────────────────────────────────────────────────────────

describe('sortRoutes', () => {
  const cheap  = makeRoute({ id: 'cheap',  price_per_kg_eur: 6,  driver: { id: 'd1', full_name: 'A', avatar_url: null, phone_verified: true, rating: 3.0, completed_trips: 5  } });
  const mid    = makeRoute({ id: 'mid',    price_per_kg_eur: 8,  driver: { id: 'd2', full_name: 'B', avatar_url: null, phone_verified: true, rating: 4.5, completed_trips: 10 } });
  const pricey = makeRoute({ id: 'pricey', price_per_kg_eur: 12, driver: { id: 'd3', full_name: 'C', avatar_url: null, phone_verified: true, rating: 5.0, completed_trips: 50 } });

  it('earliest preserves insertion order (server-sorted by departure_date)', () => {
    expect(sortRoutes([mid, cheap, pricey], 'earliest').map((r) => r.id))
      .toEqual(['mid', 'cheap', 'pricey']);
  });

  it('cheapest sorts by ascending effective price', () => {
    expect(sortRoutes([pricey, mid, cheap], 'cheapest').map((r) => r.id))
      .toEqual(['cheap', 'mid', 'pricey']);
  });

  it('cheapest respects promotion discount', () => {
    const discounted = makeRoute({
      id: 'discounted',
      price_per_kg_eur: 12,
      promotion_active: true,
      promotion_percentage: 50, // effective = 6
    });
    const result = sortRoutes([mid, discounted, cheap], 'cheapest');
    // cheap=6, discounted=6 (tie), mid=8
    expect(result[0].id).toMatch(/^(cheap|discounted)$/);
    expect(result[result.length - 1].id).toBe('mid');
  });

  it('top_rated sorts by descending driver rating', () => {
    expect(sortRoutes([cheap, mid, pricey], 'top_rated').map((r) => r.id))
      .toEqual(['pricey', 'mid', 'cheap']);
  });

  it('top_rated treats null driver as rating 0', () => {
    const noDriver = makeRoute({ id: 'nodrvr', driver: null });
    const result = sortRoutes([noDriver, cheap], 'top_rated');
    expect(result[0].id).toBe('cheap'); // rating 3.0 > 0
  });
});

// ─── 5. applyFilters ──────────────────────────────────────────────────────────

describe('applyFilters', () => {
  const r30kg   = makeRoute({ id: 'r30', available_weight_kg: 30, price_per_kg_eur: 8,
    route_stops: [makeStop(BERLIN, STOP_TYPE.COLLECTION), makeStop(TUNIS, STOP_TYPE.DROPOFF)],
    origin_city_id: BERLIN, destination_city_id: TUNIS,
  });
  const r10kg   = makeRoute({ id: 'r10', available_weight_kg: 10, price_per_kg_eur: 5,
    route_stops: [makeStop(BERLIN, STOP_TYPE.COLLECTION), makeStop(TUNIS, STOP_TYPE.DROPOFF)],
    origin_city_id: BERLIN, destination_city_id: TUNIS,
  });
  const hamburg = makeRoute({ id: 'hamburg',
    route_stops: [makeStop(HAMBURG, STOP_TYPE.COLLECTION), makeStop(TUNIS, STOP_TYPE.DROPOFF)],
    origin_city_id: HAMBURG, destination_city_id: TUNIS,
  });
  const sfax    = makeRoute({ id: 'sfax',
    route_stops: [makeStop(BERLIN, STOP_TYPE.COLLECTION), makeStop(SFAX, STOP_TYPE.DROPOFF)],
    origin_city_id: BERLIN, destination_city_id: SFAX,
  });

  it('empty filters returns all routes unchanged', () => {
    expect(applyFilters([r30kg, r10kg], {})).toHaveLength(2);
  });

  it('minCapacityKg removes routes below the threshold', () => {
    expect(applyFilters([r30kg, r10kg], { minCapacityKg: 20 }).map((r) => r.id))
      .toEqual(['r30']);
  });

  it('minCapacityKg of 0 keeps everything', () => {
    expect(applyFilters([r30kg, r10kg], { minCapacityKg: 0 })).toHaveLength(2);
  });

  it('maxPriceEur removes routes above the threshold', () => {
    expect(applyFilters([r30kg, r10kg], { maxPriceEur: 6 }).map((r) => r.id))
      .toEqual(['r10']);
  });

  it('maxPriceEur uses effective (discounted) price', () => {
    const discounted = makeRoute({
      id: 'disc',
      price_per_kg_eur: 10,
      promotion_active: true,
      promotion_percentage: 40, // effective = 6
      available_weight_kg: 20,
    });
    expect(applyFilters([r30kg, discounted], { maxPriceEur: 7 }).map((r) => r.id))
      .toEqual(['disc']);
  });

  it('originCityOverride keeps only matching origin', () => {
    expect(applyFilters([r30kg, hamburg], { originCityOverride: BERLIN }).map((r) => r.id))
      .toEqual(['r30']);
  });

  it('destCityOverride keeps only matching destination', () => {
    expect(applyFilters([r30kg, sfax], { destCityOverride: TUNIS }).map((r) => r.id))
      .toEqual(['r30']);
  });

  it('combined filters are ANDed together', () => {
    const heavy = makeRoute({ id: 'heavy', available_weight_kg: 50, price_per_kg_eur: 12,
      origin_city_id: BERLIN, destination_city_id: TUNIS });
    expect(
      applyFilters([r30kg, r10kg, heavy], { minCapacityKg: 20, maxPriceEur: 9 }).map((r) => r.id),
    ).toEqual(['r30']);
  });
});

// ─── 6. Filter input helpers (from utils/filterInput.ts) ──────────────────────

describe('filter input helpers', () => {
  describe('toNumericString', () => {
    it('passes plain integers through', () => {
      expect(toNumericString('20')).toBe('20');
    });

    it('passes decimal values through', () => {
      expect(toNumericString('4.5')).toBe('4.5');
    });

    it('strips letters', () => {
      expect(toNumericString('12abc')).toBe('12');
    });

    it('strips symbols except dot', () => {
      expect(toNumericString('€8/kg')).toBe('8');
    });

    it('returns empty string for fully non-numeric input', () => {
      expect(toNumericString('abc')).toBe('');
    });
  });

  describe('parseFilterNumber', () => {
    it('parses a valid integer string', () => {
      expect(parseFilterNumber('20')).toBe(20);
    });

    it('parses a valid decimal string', () => {
      expect(parseFilterNumber('4.5')).toBe(4.5);
    });

    it('returns undefined for empty string (no filter active)', () => {
      expect(parseFilterNumber('')).toBeUndefined();
    });

    it('returns 0 for "0" — zero is a valid threshold, not a missing filter', () => {
      expect(parseFilterNumber('0')).toBe(0);
    });

    it('returns undefined for a bare dot', () => {
      expect(parseFilterNumber('.')).toBeUndefined();
    });
  });

  describe('combined: typing into the min capacity filter', () => {
    it('typing "5" produces minCapacityKg: 5', () => {
      const sanitised = toNumericString('5');
      expect(parseFilterNumber(sanitised)).toBe(5);
    });

    it('typing "0" produces minCapacityKg: 0 — does NOT clear the filter', () => {
      // The old `parseFloat('0') || undefined` bug returned undefined here
      const sanitised = toNumericString('0');
      expect(parseFilterNumber(sanitised)).toBe(0);
    });

    it('typing a letter produces undefined — filter is cleared', () => {
      const sanitised = toNumericString('x');
      expect(parseFilterNumber(sanitised)).toBeUndefined();
    });
  });

  describe('combined: typing into the max price filter', () => {
    it('typing "3.5" produces maxPriceEur: 3.5', () => {
      const sanitised = toNumericString('3.5');
      expect(parseFilterNumber(sanitised)).toBe(3.5);
    });

    it('clearing the field (empty string) produces undefined — no max price applied', () => {
      const sanitised = toNumericString('');
      expect(parseFilterNumber(sanitised)).toBeUndefined();
    });
  });
});
