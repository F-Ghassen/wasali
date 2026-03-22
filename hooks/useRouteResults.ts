import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 100;

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
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
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
  route_stops: {
    id: string;
    city: string;
    country: string;
    stop_order: number;
    stop_type: string;
    is_pickup_available: boolean;
    is_dropoff_available: boolean;
    arrival_date: string | null;
    meeting_point_url: string | null;
  }[];
  route_services: {
    id: string;
    service_type: string;
    price_eur: number;
  }[];
  driver: RouteResultDriver | null;
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
    (r) => r.origin_city === originCityName && r.destination_city === destCityName,
  );
  const tier2 = routes.filter(
    (r) => !(r.origin_city === originCityName && r.destination_city === destCityName),
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
  return routes; // 'earliest' — already ordered server-side
}

function applyFilters(routes: RouteResult[], filters: FilterState): RouteResult[] {
  return routes
    .filter((r) => r.available_weight_kg >= (filters.minCapacityKg ?? 0))
    .filter(
      (r) => filters.maxPriceEur == null || effectivePrice(r) <= filters.maxPriceEur,
    )
    .filter(
      (r) => !filters.originCityOverride || r.origin_city === filters.originCityOverride,
    )
    .filter(
      (r) => !filters.destCityOverride || r.destination_city === filters.destCityOverride,
    );
}

interface UseRouteResultsParams {
  originCityName: string;
  originCountry: string;
  originCityId?: string;
  destCityName: string;
  destCountry: string;
  destCityId?: string;
  departFromDate: string;
}

export function useRouteResults(params: UseRouteResultsParams) {
  const { originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate } = params;

  const [allRoutes, setAllRoutes] = useState<RouteResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('earliest');
  const [filters, setFilters] = useState<FilterState>({});

  const fetchPage = useCallback(
    async (pageIndex: number, reset = false) => {
      const start = pageIndex * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      if (reset) setIsFetching(true);
      else setIsFetchingMore(true);

      try {
        // Prefer city_id matching when both IDs are available; fall back to text match
        const orFilter = originCityId && destCityId
          ? `and(origin_city_id.eq.${originCityId},destination_city_id.eq.${destCityId}),` +
            `and(origin_country.eq.${originCountry},destination_country.eq.${destCountry})`
          : `and(origin_city.eq.${originCityName},destination_city.eq.${destCityName}),` +
            `and(origin_country.eq.${originCountry},destination_country.eq.${destCountry})`;

        const { data, error } = await supabase
          .from('routes')
          .select(`
            id, origin_city, origin_country, destination_city, destination_country,
            departure_date, estimated_arrival_date,
            available_weight_kg, min_weight_kg, price_per_kg_eur,
            vehicle_type, notes, status,
            promotion_percentage, promotion_active,
            route_stops(id, city, country, stop_order, stop_type, is_pickup_available, is_dropoff_available, arrival_date, meeting_point_url),
            route_services(id, service_type, price_eur),
            driver:profiles!driver_id(id, full_name, avatar_url, phone_verified, rating, completed_trips)
          `)
          .eq('status', 'active')
          .gte('departure_date', departFromDate)
          .or(orFilter)
          .order('departure_date', { ascending: true })
          .range(start, end);

        if (error) throw error;

        const fetched = (data ?? []) as RouteResult[];
        setAllRoutes((prev) => (reset ? fetched : [...prev, ...fetched]));
        setHasMore(fetched.length === PAGE_SIZE);
        setPage(pageIndex);
      } finally {
        if (reset) setIsFetching(false);
        else setIsFetchingMore(false);
      }
    },
    [originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate],
  );

  const refresh = useCallback(() => fetchPage(0, true), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore) return;
    fetchPage(page + 1);
  }, [hasMore, isFetchingMore, page, fetchPage]);

  const { tier1: rawTier1, tier2: rawTier2 } = splitTiers(
    allRoutes,
    originCityName,
    destCityName,
  );

  const tier1 = sortRoutes(applyFilters(rawTier1, filters), sortKey);
  const tier2 = sortRoutes(applyFilters(rawTier2, filters), sortKey);

  const activeFilterCount =
    (filters.minCapacityKg != null && filters.minCapacityKg > 0 ? 1 : 0) +
    (filters.maxPriceEur != null ? 1 : 0) +
    (filters.originCityOverride ? 1 : 0) +
    (filters.destCityOverride ? 1 : 0);

  return {
    tier1,
    tier2,
    allRoutes,
    sortKey,
    setSortKey,
    filters,
    setFilters,
    activeFilterCount,
    isFetching,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
