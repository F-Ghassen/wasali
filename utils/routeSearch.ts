import type { RouteResult, SortKey, FilterState } from '@/hooks/useRouteResults';
import { STOP_TYPE } from '@/constants/stopTypes';

export function effectivePrice(route: RouteResult): number {
  return route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;
}

export function splitTiers(
  routes: RouteResult[],
  originCityId: string | undefined,
  destCityId: string | undefined,
): { tier1: RouteResult[]; tier2: RouteResult[] } {
  if (!destCityId) {
    return { tier1: routes, tier2: [] };
  }

  const isExactMatch = (r: RouteResult) => {
    const hasOrigin = !originCityId || r.route_stops.some(
      (s) => s.stop_type === STOP_TYPE.COLLECTION && s.city_id === originCityId,
    );
    const hasDest = r.route_stops.some(
      (s) => s.stop_type === STOP_TYPE.DROPOFF && s.city_id === destCityId,
    );
    return hasOrigin && hasDest;
  };

  const tier1 = routes.filter(isExactMatch);
  const tier2 = routes.filter((r) => !isExactMatch(r));

  return { tier1, tier2 };
}

export function sortRoutes(routes: RouteResult[], sortKey: SortKey): RouteResult[] {
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

export function applyFilters(routes: RouteResult[], filters: FilterState): RouteResult[] {
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
