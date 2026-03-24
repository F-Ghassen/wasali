import type { BookingWithDriver } from '../types/index';

export function getOriginCity(booking: BookingWithDriver): string {
  const stops = booking.route?.route_stops as any[] | undefined;
  if (stops && stops.length > 0) {
    const firstStop = stops.sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0))[0];
    return firstStop?.location_name || 'origin';
  }
  return 'origin';
}

export function getDestinationCity(booking: BookingWithDriver): string {
  const stops = booking.route?.route_stops as any[] | undefined;
  if (stops && stops.length > 0) {
    const lastStop = stops.sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0))[stops.length - 1];
    return lastStop?.location_name || 'destination';
  }
  return 'destination';
}
