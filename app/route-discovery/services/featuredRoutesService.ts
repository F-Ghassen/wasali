import { supabase } from '@/lib/supabase';
import type { FeaturedRoute, FeaturedRouteStop, StopType } from '@/app/route-discovery/types/featured-route';

const ROUTE_SELECT = `
  id,
  departure_date, available_weight_kg, total_weight_kg, price_per_kg_eur,
  promotion_percentage, promotion_active, prohibited_items, created_at,
  is_featured, driver:profiles!driver_id(id, full_name, rating, completed_trips),
  route_stops(id, city_id, stop_type, stop_order, arrival_date),
  route_services(id, service_type)
`;

async function fetchCitiesMap(
  cityIds: string[],
): Promise<Map<string, { name: string; country: string; flagEmoji: string }>> {
  if (cityIds.length === 0) return new Map();

  const { data } = await supabase
    .from('cities')
    .select('id, name, country, flag_emoji')
    .in('id', cityIds);

  return new Map(
    data?.map((c: any) => [
      c.id,
      { name: c.name, country: c.country, flagEmoji: c.flag_emoji ?? '🌍' },
    ]) ?? [],
  );
}

function mapRows(rows: any[], cityMap: Map<string, { name: string; country: string; flagEmoji: string }>): FeaturedRoute[] {
  return rows.map((r) => {
    const sortedStops = (r.route_stops ?? []).sort(
      (a: any, b: any) => a.stop_order - b.stop_order,
    );
    const originStop      = sortedStops[0] ?? null;
    const destinationStop = sortedStops[sortedStops.length - 1] ?? null;

    const originData      = originStop      ? cityMap.get(originStop.city_id)      : null;
    const destinationData = destinationStop ? cityMap.get(destinationStop.city_id) : null;

    const stops: FeaturedRouteStop[] = sortedStops.map((stop: any) => {
      const city = cityMap.get(stop.city_id);
      return {
        city_id:   stop.city_id,
        cityName:  city?.name     ?? 'Unknown',
        country:   city?.country  ?? '',
        flagEmoji: city?.flagEmoji ?? '🌍',
        stopType:  (stop.stop_type === 'dropoff' ? 'dropoff' : 'collection') as StopType,
        stopOrder: stop.stop_order,
        arrivalDate: stop.arrival_date,
      };
    });

    return {
      id:               r.id,
      driverName:       r.driver?.full_name     ?? 'Driver',
      driverRating:     r.driver?.rating        ?? null,
      driverTrips:      r.driver?.completed_trips ?? 0,
      from:             originData?.name         ?? 'Origin',
      to:               destinationData?.name    ?? 'Destination',
      fromCountry:      originData?.country      ?? '',
      fromFlag:         originData?.flagEmoji    ?? '🌍',
      toCountry:        destinationData?.country  ?? '',
      toFlag:           destinationData?.flagEmoji ?? '🌍',
      originCity:       originData?.name         ?? 'Origin',
      originDate:       originStop?.arrival_date ?? r.departure_date,
      destinationCity:  destinationData?.name    ?? 'Destination',
      destinationDate:  destinationStop?.arrival_date ?? r.departure_date,
      departureDate:    new Date(r.departure_date),
      capacityLeft:     r.available_weight_kg,
      totalWeight:      r.total_weight_kg || r.available_weight_kg,
      pricePerKg:       r.price_per_kg_eur,
      pricePromotion:   r.promotion_active && r.promotion_percentage ? r.promotion_percentage : null,
      prohibitedItems:  Array.isArray(r.prohibited_items) ? r.prohibited_items : [],
      createdAt:        r.created_at,
      services:         r.route_services?.map((s: any) => s.service_type).filter(Boolean) ?? [],
      stops,
      isFull:           r.available_weight_kg <= 0,
    };
  });
}

async function mapRoutes(rows: any[]): Promise<FeaturedRoute[]> {
  const cityIds = new Set<string>();
  rows.forEach((r) => r.route_stops?.forEach((s: any) => { if (s.city_id) cityIds.add(s.city_id); }));
  const cityMap = await fetchCitiesMap(Array.from(cityIds));
  return mapRows(rows, cityMap);
}

export async function fetchFeaturedRoutes(): Promise<FeaturedRoute[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: featured } = await supabase
    .from('routes')
    .select(ROUTE_SELECT)
    .eq('status', 'active')
    .eq('is_featured', true)
    .gte('available_weight_kg', 1)
    .gte('departure_date', today)
    .order('departure_date', { ascending: true })
    .limit(6);

  if (featured && featured.length > 0) return mapRoutes(featured);

  const { data: fallback } = await supabase
    .from('routes')
    .select(ROUTE_SELECT)
    .eq('status', 'active')
    .gte('available_weight_kg', 1)
    .gte('departure_date', today)
    .order('price_per_kg_eur', { ascending: true })
    .limit(6);

  return fallback ? mapRoutes(fallback) : [];
}
