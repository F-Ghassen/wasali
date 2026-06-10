import type { BookingWithDriver } from '../types/index';

type StopWithCity = { stop_order?: number | null; location_name?: string | null; city?: { name: string; flag_emoji: string; country_code: string } | null };

function sortedStops(booking: BookingWithDriver): StopWithCity[] {
  const stops = booking.route?.route_stops as StopWithCity[] | undefined;
  if (!stops || stops.length === 0) return [];
  return [...stops].sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
}

export function getOriginCity(booking: BookingWithDriver): string {
  const stops = sortedStops(booking);
  return stops[0]?.city?.name || stops[0]?.location_name || 'origin';
}

export function getDestinationCity(booking: BookingWithDriver): string {
  const stops = sortedStops(booking);
  return stops[stops.length - 1]?.city?.name || stops[stops.length - 1]?.location_name || 'destination';
}

export function getOriginFlag(booking: BookingWithDriver): string {
  const stops = sortedStops(booking);
  return stops[0]?.city?.flag_emoji ?? '🌍';
}

export function getDestinationFlag(booking: BookingWithDriver): string {
  const stops = sortedStops(booking);
  return stops[stops.length - 1]?.city?.flag_emoji ?? '🌍';
}
