export type StopType = 'collection' | 'dropoff';

export type FeaturedRouteStop = {
  city_id: string;
  cityName: string;
  country: string;
  flagEmoji: string;
  stopType: StopType;
  stopOrder: number;
  arrivalDate: string;
};

export type FeaturedRoute = {
  id: string;
  driverName: string;
  driverRating: number | null;
  driverTrips: number;
  from: string;
  to: string;
  fromCountry: string;
  fromFlag: string;
  toCountry: string;
  toFlag: string;
  originCity: string;
  originDate: string;
  destinationCity: string;
  destinationDate: string;
  departureDate: Date;
  capacityLeft: number;
  totalWeight: number;
  pricePerKg: number;
  pricePromotion: number | null;
  prohibitedItems: string[];
  createdAt: string;
  services: string[];
  stops: FeaturedRouteStop[];
  isFull: boolean;
};
