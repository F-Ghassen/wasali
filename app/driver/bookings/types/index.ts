import type { BookingWithSender } from '@/types/models';

/**
 * View-model type for the driver booking detail screen — extends
 * BookingWithSender (already includes `sender`) with the extra route_stops
 * (for trip cities) and sender rating/trip-count fields fetched by the
 * extended select in stores/driverBookingStore.ts fetchBookings().
 */
export type DriverBookingDetail = BookingWithSender & {
  sender?: BookingWithSender['sender'] & {
    rating?: number | null;
    completed_trips?: number | null;
  };
};

export type StopWithCity = {
  stop_order?: number | null;
  stop_type?: string | null;
  location_name?: string | null;
  city?: { name: string; flag_emoji: string; country_code: string } | null;
};
