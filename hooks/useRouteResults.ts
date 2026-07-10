import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useCitiesStore } from '@/stores/citiesStore';
import { STOP_TYPE } from '@/constants/stopTypes';
import { splitTiers, sortRoutes, applyFilters } from '@/utils/routeSearch';

const PAGE_SIZE = 100;

// Shared Supabase select string — keeps fetchAll and fetchFallback in sync
const ROUTE_SELECT = `
  id, departure_date, estimated_arrival_date,
  available_weight_kg, min_weight_kg, price_per_kg_eur,
  vehicle_type, notes, status,
  promotion_percentage, promotion_active,
  route_stops(id, city_id, route_id, stop_order, stop_type, is_pickup_available, is_dropoff_available, arrival_date, meeting_point_url, location_name, location_address),
  route_services(id, service_type, price_eur),
  driver:profiles!driver_id(id, full_name, avatar_url, phone_verified, rating, completed_trips)
`.trim();

export type SortKey = 'earliest' | 'cheapest' | 'top_rated';

export interface FilterState {
  minCapacityKg?: number;
  maxPriceEur?: number;
  originCityOverride?: string;
  destCityOverride?: string;
}

export interface RouteResultDriver {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean;
  rating: number;
  completed_trips: number;
}

export interface RouteResult {
  id: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  available_weight_kg: number;
  min_weight_kg: number | null;
  price_per_kg_eur: number;
  vehicle_type: string | null;
  notes: string | null;
  status: string;
  promotion_percentage: number | null;
  promotion_active: boolean;
  /** Derived from the collection stop's city_id — used by originCityOverride filter */
  origin_city_id: string | null;
  /** Derived from the dropoff stop's city_id — used by destCityOverride filter */
  destination_city_id: string | null;
  route_stops: {
    id: string;
    city_id: string;
    route_id: string;
    stop_order: number;
    stop_type: string;
    is_pickup_available: boolean;
    is_dropoff_available: boolean;
    arrival_date: string | null;
    meeting_point_url: string | null;
    location_name: string | null;
    location_address: string | null;
  }[];
  route_services: {
    id: string;
    service_type: string;
    price_eur: number;
  }[];
  driver: RouteResultDriver | null;
}

interface UseRouteResultsParams {
  originCityName: string;
  originCountry: string;
  originCityId?: string;
  destCityName: string;
  destCountry: string;
  destCityId?: string;
  departFromDate: string | null;
}

export function useRouteResults(params: UseRouteResultsParams) {
  const { originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate } = params;
  const cities = useCitiesStore((s) => s.cities);

  // allRoutes holds the DISPLAYED slice (page 0..N accumulated).
  // filteredCache holds the full in-memory filtered+sorted list so we can
  // paginate it client-side without re-fetching.
  const [allRoutes, setAllRoutes] = useState<RouteResult[]>([]);
  const [filteredCache, setFilteredCache] = useState<RouteResult[]>([]);
  const [fallbackRoutes, setFallbackRoutes] = useState<RouteResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('earliest');
  const [filters, setFilters] = useState<FilterState>({});
  const [error, setError] = useState<string | null>(null);

  // ── fetchAll: load every matching route from DB, filter in-memory, cache ──
  // Because city/country matching requires inspecting nested route_stops we
  // cannot push that predicate to Supabase. We fetch the full corridor batch
  // once and paginate the result locally — the same pattern used by bookings
  // but with the DB range() replaced by an in-memory slice on filteredCache.
  const fetchAll = useCallback(
    async () => {
      setIsFetching(true);
      setError(null);
      try {
        const dateFloor = departFromDate ?? format(new Date(), 'yyyy-MM-dd');

        const { data: rawData, error: dbError } = await supabase
          .from('routes')
          .select(ROUTE_SELECT)
          .eq('status', 'active')
          .gt('available_weight_kg', 0)
          .or(`departure_date.gte.${dateFloor},departure_date.is.null`)
          .order('departure_date', { ascending: true, nullsFirst: false });

        if (dbError) throw dbError;

        // ── In-memory corridor filter (country level) ──────────────────────
        // Filtering at country level so tier2 (same corridor, different city)
        // is populated. splitTiers() then separates exact city matches (tier1)
        // from broader country matches (tier2).
        let filtered = (rawData ?? []) as unknown as RouteResult[];

        if (originCityId || originCountry) {
          const resolvedOriginCountry = originCountry
            || cities.find((c) => c.id === originCityId)?.country;

          filtered = filtered.filter((r) =>
            r.route_stops?.some((s) => {
              if (s.stop_type !== STOP_TYPE.COLLECTION || !s.city_id) return false;
              const city = cities.find((c) => c.id === s.city_id);
              return city?.country === resolvedOriginCountry;
            }) ?? false,
          );
        }

        if (destCityId || destCountry) {
          const resolvedDestCountry = destCountry
            || cities.find((c) => c.id === destCityId)?.country;

          filtered = filtered.filter((r) =>
            r.route_stops?.some((s) => {
              if (s.stop_type !== STOP_TYPE.DROPOFF || !s.city_id) return false;
              const city = cities.find((c) => c.id === s.city_id);
              return city?.country === resolvedDestCountry;
            }) ?? false,
          );
        }

        // Derive origin/destination city IDs from the first stop of each type.
        // splitTiers() re-checks all stops directly; these are used only by
        // the client-side capacity/price filters.
        const withCityIds = filtered.map((r) => {
          const pickupStop  = r.route_stops?.find((s) => s.stop_type === STOP_TYPE.COLLECTION);
          const dropoffStop = r.route_stops?.find((s) => s.stop_type === STOP_TYPE.DROPOFF);
          return {
            ...r,
            origin_city_id:      pickupStop?.city_id  ?? null,
            destination_city_id: dropoffStop?.city_id ?? null,
          };
        });

        // Store the full filtered list; show first page immediately
        setFilteredCache(withCityIds);
        const firstPage = withCityIds.slice(0, PAGE_SIZE);
        setAllRoutes(firstPage);
        setHasMore(withCityIds.length > PAGE_SIZE);
        setPage(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load routes';
        setError(message);
        setAllRoutes([]);
        setFilteredCache([]);
      } finally {
        setIsFetching(false);
      }
    },
    [originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate],
  );

  const refresh = useCallback(() => fetchAll(), [fetchAll]);

  // ── loadMore: slice next page out of the in-memory cache ──────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to   = from + PAGE_SIZE;
    const nextSlice = filteredCache.slice(from, to);
    setAllRoutes((prev) => [...prev, ...nextSlice]);
    setHasMore(to < filteredCache.length);
    setPage(nextPage);
    setIsFetchingMore(false);
  }, [hasMore, isFetchingMore, page, filteredCache]);

  // When the corridor search yields no results, fetch all active upcoming routes
  // so the "All other drivers" section can still show something useful.
  const fetchFallback = useCallback(async () => {
    try {
      const dateFloor = departFromDate ?? format(new Date(), 'yyyy-MM-dd');
      const { data, error: dbError } = await supabase
        .from('routes')
        .select(ROUTE_SELECT)
        .eq('status', 'active')
        .gt('available_weight_kg', 0)
        .or(`departure_date.gte.${dateFloor},departure_date.is.null`)
        .order('departure_date', { ascending: true, nullsFirst: false })
        .limit(PAGE_SIZE);

      if (dbError || !data) return;

      const withCityIds = (data as unknown as RouteResult[]).map((r) => {
        const pickupStop  = r.route_stops?.find((s) => s.stop_type === STOP_TYPE.COLLECTION);
        const dropoffStop = r.route_stops?.find((s) => s.stop_type === STOP_TYPE.DROPOFF);
        return { ...r, origin_city_id: pickupStop?.city_id ?? null, destination_city_id: dropoffStop?.city_id ?? null };
      });
      setFallbackRoutes(withCityIds);
    } catch {
      // Fallback fetch is best-effort; don't surface errors for it
    }
  }, [departFromDate]);

  // When sortKey changes, reset the displayed slice to page 0 so the full
  // sorted order is visible from the top (same as a fresh search).
  useEffect(() => {
    if (filteredCache.length === 0) return;
    const firstPage = filteredCache.slice(0, PAGE_SIZE);
    setAllRoutes(firstPage);
    setHasMore(filteredCache.length > PAGE_SIZE);
    setPage(0);
  // Intentional: exclude filteredCache to prevent double-fetch when routes load
  }, [sortKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger fallback fetch whenever the main search comes back empty
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  useEffect(() => {
    if (!isFetching && allRoutes.length === 0) {
      setIsFetchingFallback(true);
      fetchFallback().finally(() => setIsFetchingFallback(false));
    } else {
      setFallbackRoutes([]);
    }
  }, [isFetching, allRoutes.length, fetchFallback]);

  const { tier1: rawTier1, tier2: rawTier2 } = splitTiers(
    allRoutes,
    originCityId,
    destCityId,
  );

  const tier1 = sortRoutes(applyFilters(rawTier1, filters), sortKey);
  const tier2 = sortRoutes(applyFilters(rawTier2, filters), sortKey);

  const activeFilterCount =
    (filters.minCapacityKg != null && filters.minCapacityKg > 0 ? 1 : 0) +
    (filters.maxPriceEur != null ? 1 : 0) +
    (filters.originCityOverride != null ? 1 : 0) +
    (filters.destCityOverride != null ? 1 : 0);

  return {
    tier1,
    tier2,
    allRoutes,
    fallbackRoutes,
    sortKey,
    setSortKey,
    filters,
    setFilters,
    activeFilterCount,
    error,
    isFetching,
    isFetchingFallback,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
