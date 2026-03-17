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
