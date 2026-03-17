import type { Tables } from './database';

// Re-export for convenience
export type Profile = Tables<'profiles'>;
export type Route = Tables<'routes'>;
export type RouteStop = Tables<'route_stops'>;
export type Booking = Tables<'bookings'>;
export type ShippingRequest = Tables<'shipping_requests'>;
export type ShippingRequestOffer = Tables<'shipping_request_offers'>;
export type Rating = Tables<'ratings'>;
export type Dispute = Tables<'disputes'>;
export type SavedAddress = Tables<'saved_addresses'>;

// Joined types
export type RouteWithStops = Route & {
  route_stops: RouteStop[];
  driver?: Partial<Profile>;
};

export type BookingWithRoute = Booking & {
  route?: RouteWithStops;
  sender?: Partial<Profile>;
};

export type ShippingRequestWithOffers = ShippingRequest & {
  shipping_request_offers: (ShippingRequestOffer & {
    driver?: Partial<Profile>;
  })[];
};

export type UserRole = 'sender' | 'driver';

// Route template (for wizard reuse)
// Defined inline since route_templates table is new and not yet in generated types
export type RouteTemplate = {
  id: string;
  driver_id: string;
  name: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  available_weight_kg: number;
  price_per_kg_eur: number;
  payment_methods: string[];
  notes?: string | null;
  created_at: string;
};

export type BookingWithSender = Booking & {
  route?: RouteWithStops;
  sender?: Partial<Profile>;
};

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type RouteStatus = 'active' | 'full' | 'cancelled' | 'completed';
export type RequestStatus = 'open' | 'offer_accepted' | 'expired' | 'cancelled';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
