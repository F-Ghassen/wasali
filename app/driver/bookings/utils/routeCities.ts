import type { DriverBookingDetail, StopWithCity } from '../types/index';

// Adapted from app/(sender)/booking/bookingDetail/utils/routeCities.ts —
// duplicated rather than cross-imported across the sender/driver route
// boundary, since the two screens' booking shapes diverge slightly
// (DriverBookingDetail vs BookingWithDriver).

function sortedStops(booking: DriverBookingDetail): StopWithCity[] {
  const stops = booking.route?.route_stops as StopWithCity[] | undefined;
  if (!stops || stops.length === 0) return [];
  return [...stops].sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
}

export function getOriginCity(booking: DriverBookingDetail): string {
  const stops = sortedStops(booking);
  return stops[0]?.city?.name || stops[0]?.location_name || 'origin';
}

export function getDestinationCity(booking: DriverBookingDetail): string {
  const stops = sortedStops(booking);
  return stops[stops.length - 1]?.city?.name || stops[stops.length - 1]?.location_name || 'destination';
}

export function getOriginFlag(booking: DriverBookingDetail): string {
  const stops = sortedStops(booking);
  return stops[0]?.city?.flag_emoji ?? '🌍';
}

export function getDestinationFlag(booking: DriverBookingDetail): string {
  const stops = sortedStops(booking);
  return stops[stops.length - 1]?.city?.flag_emoji ?? '🌍';
}
