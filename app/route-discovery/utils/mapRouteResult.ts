import type { RouteResult } from '@/hooks/useRouteResults';
import type { FeaturedRoute, FeaturedRouteStop, StopType } from '@/app/route-discovery/types/featured-route';

type CityLookup = (id: string) => { name: string; country: string; flagEmoji: string } | undefined;

export function mapRouteResultToFeaturedRoute(
  route: RouteResult,
  getCity: CityLookup,
): FeaturedRoute {
  const sortedStops = [...(route.route_stops ?? [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  );

  const originStop      = sortedStops[0] ?? null;
  const destinationStop = sortedStops[sortedStops.length - 1] ?? null;

  const originData      = originStop      ? getCity(originStop.city_id)      : undefined;
  const destinationData = destinationStop ? getCity(destinationStop.city_id) : undefined;

  const stops: FeaturedRouteStop[] = sortedStops.map((stop) => {
    const city = getCity(stop.city_id);
    return {
      city_id:     stop.city_id,
      cityName:    city?.name      ?? 'Unknown',
      country:     city?.country   ?? '',
      flagEmoji:   city?.flagEmoji ?? '🌍',
      stopType:    (stop.stop_type === 'dropoff' ? 'dropoff' : 'collection') as StopType,
      stopOrder:   stop.stop_order,
      arrivalDate: stop.arrival_date ?? '',
    };
  });

  return {
    id:              route.id,
    driverName:      route.driver?.full_name     ?? 'Driver',
    driverRating:    route.driver?.rating        ?? null,
    driverTrips:     route.driver?.completed_trips ?? 0,
    from:            originData?.name            ?? 'Origin',
    to:              destinationData?.name       ?? 'Destination',
    fromCountry:     originData?.country         ?? '',
    fromFlag:        originData?.flagEmoji       ?? '🌍',
    toCountry:       destinationData?.country    ?? '',
    toFlag:          destinationData?.flagEmoji  ?? '🌍',
    originCity:      originData?.name            ?? 'Origin',
    originDate:      originStop?.arrival_date    ?? route.departure_date,
    destinationCity: destinationData?.name       ?? 'Destination',
    destinationDate: destinationStop?.arrival_date ?? route.departure_date,
    departureDate:   new Date(route.departure_date),
    capacityLeft:    route.available_weight_kg,
    totalWeight:     route.available_weight_kg,
    pricePerKg:      route.price_per_kg_eur,
    pricePromotion:  route.promotion_active && route.promotion_percentage
      ? route.promotion_percentage
      : null,
    prohibitedItems: [],
    createdAt:       route.departure_date,
    services:        route.route_services?.map((s) => s.service_type).filter(Boolean) ?? [],
    stops,
    isFull:          route.available_weight_kg <= 0,
  };
}
