import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useCitiesStore } from '@/stores/citiesStore';

const PAGE_SIZE = 100;

export type SortKey = 'earliest' | 'cheapest' | 'top_rated';

export interface FilterState {
  minCapacityKg?: number;
  maxPriceEur?: number;
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

function effectivePrice(route: RouteResult): number {
  return route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;
}

function splitTiers(
  routes: RouteResult[],
  originCityId: string | undefined,
  destCityId: string | undefined,
): { tier1: RouteResult[]; tier2: RouteResult[] } {
  // If no destination specified, show all routes in tier1 (no tier2)
  if (!destCityId) {
    return { tier1: routes, tier2: [] };
  }

  const tier1 = routes.filter((r) => {
    const pickupStop = r.route_stops?.find((s) => s.stop_type === 'collection');
    const dropoffStop = r.route_stops?.find((s) => s.stop_type === 'dropoff');
    return pickupStop?.city_id === originCityId && dropoffStop?.city_id === destCityId;
  });

  const tier2 = routes.filter((r) => {
    const pickupStop = r.route_stops?.find((s) => s.stop_type === 'collection');
    const dropoffStop = r.route_stops?.find((s) => s.stop_type === 'dropoff');
    return !(pickupStop?.city_id === originCityId && dropoffStop?.city_id === destCityId);
  });

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
  const cities = useCitiesStore((s) => s.cities);

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
        // Fetch all routes with stops (we'll filter in-memory by route_stops)
        let query = supabase
          .from('routes')
          .select(`
            id, departure_date, estimated_arrival_date,
            available_weight_kg, min_weight_kg, price_per_kg_eur,
            vehicle_type, notes, status,
            promotion_percentage, promotion_active,
            route_stops(id, city_id, route_id, stop_order, stop_type, is_pickup_available, is_dropoff_available, arrival_date, meeting_point_url, location_name, location_address),
            route_services(id, service_type, price_eur),
            driver:profiles!driver_id(id, full_name, avatar_url, phone_verified, rating, completed_trips)
          `)
          .eq('status', 'active')
          .gt('available_weight_kg', 0)
          .gte('departure_date', departFromDate || format(new Date(), 'yyyy-MM-dd'));

        const { data: allData, error } = await query
          .order('departure_date', { ascending: true });

        if (error) throw error;

        // Filter by origin and destination using route_stops
        let filtered = (allData ?? []) as RouteResult[];

        if (originCityId || originCountry) {
          filtered = filtered.filter((r) => {
            const pickupStop = r.route_stops?.find((s) => s.stop_type === 'collection');
            if (!pickupStop?.city_id) return false;

            if (originCityId) {
              return pickupStop.city_id === originCityId;
            } else {
              // Country-level search
              const city = cities.find((c) => c.id === pickupStop.city_id);
              return city?.country === originCountry;
            }
          });
        }

        if (destCityId) {
          filtered = filtered.filter((r) => {
            const dropoffStop = r.route_stops?.find((s) => s.stop_type === 'dropoff');
            return dropoffStop?.city_id === destCityId;
          });
        }

        // Apply pagination
        const data = filtered.slice(start, end);

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
    originCityId,
    destCityId,
  );

  const tier1 = sortRoutes(applyFilters(rawTier1, filters), sortKey);
  const tier2 = sortRoutes(applyFilters(rawTier2, filters), sortKey);

  const activeFilterCount =
    (filters.minCapacityKg != null && filters.minCapacityKg > 0 ? 1 : 0) +
    (filters.maxPriceEur != null ? 1 : 0);

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
