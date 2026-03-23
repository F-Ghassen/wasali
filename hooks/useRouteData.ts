import { useState, useEffect, useCallback } from 'react';
import { startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchedStop {
  id: string;
  city_id: string;
  arrival_date: string | null;
  stop_type: string;
  stop_order: number;
  location_name: string | null;
  location_address: string | null;
  is_pickup_available: boolean;
  is_dropoff_available: boolean;
  meeting_point_url: string | null;
}

export interface FetchedService {
  id: string;
  route_stop_id: string | null;
  service_type: string;
  price_eur: number;
  location_name: string | null;
  location_address: string | null;
  instructions: string | null;
}

export interface FetchedPaymentMethod {
  id: string;
  payment_type: string;
  enabled: boolean;
}

export interface FetchedRoute {
  id: string;
  origin_city_id: string;
  destination_city_id: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  available_weight_kg: number;
  price_per_kg_eur: number;
  promotion_percentage: number | null;
  promotion_active: boolean;
  driver: {
    id: string;
    full_name: string | null;
    phone: string | null;
    phone_verified: boolean;
    rating: number;
    completed_trips: number;
  } | null;
  route_stops: FetchedStop[];
  route_services: FetchedService[];
  route_payment_methods: FetchedPaymentMethod[];
}

export type RouteError = 'not_found' | 'route_full' | 'route_departed' | 'network';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRouteData(routeId: string | null): {
  route: FetchedRoute | null;
  collectionStops: FetchedStop[];
  dropoffStops: FetchedStop[];
  collectionServicesForStop: (stopId: string) => FetchedService[];
  deliveryServices: FetchedService[];
  paymentMethods: FetchedPaymentMethod[];
  isLoading: boolean;
  error: RouteError | null;
  retry: () => void;
} {
  const [route, setRoute] = useState<FetchedRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RouteError | null>(null);
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!routeId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    supabase
      .from('routes')
      .select(`
        id, origin_city_id, destination_city_id,
        departure_date, estimated_arrival_date,
        available_weight_kg, price_per_kg_eur,
        promotion_percentage, promotion_active,
        driver:profiles!driver_id(
          id, full_name, phone, phone_verified, rating, completed_trips
        ),
        route_stops(
          id, city_id, arrival_date, stop_type, stop_order,
          location_name, location_address,
          is_pickup_available, is_dropoff_available, meeting_point_url
        ),
        route_services(
          id, route_stop_id, service_type, price_eur,
          location_name, location_address, instructions
        ),
        route_payment_methods(id, payment_type, enabled)
      `)
      .eq('id', routeId)
      .single()
      .then(
        ({ data, error: fetchError }) => {
          if (cancelled) return;
          setIsLoading(false);

          if (fetchError || !data) {
            setError('not_found');
            return;
          }

          const r = data as unknown as FetchedRoute;

          // Guard: route departed
          if (new Date(r.departure_date) < startOfDay(new Date())) {
            setError('route_departed');
            return;
          }

          // Guard: route full
          if (r.available_weight_kg <= 0) {
            setError('route_full');
            return;
          }

          setRoute(r);
        },
        () => {
          if (!cancelled) {
            setIsLoading(false);
            setError('network');
          }
        }
      );

    return () => { cancelled = true; };
  }, [routeId, tick]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const collectionStops = route
    ? route.route_stops
        .filter((s) => s.is_pickup_available)
        .sort((a, b) => a.stop_order - b.stop_order)
    : [];

  const dropoffStops = route
    ? route.route_stops
        .filter((s) => s.is_dropoff_available)
        .sort((a, b) => a.stop_order - b.stop_order)
    : [];

  const collectionServicesForStop = useCallback(
    (stopId: string): FetchedService[] =>
      route
        ? route.route_services.filter(
            (s) =>
              // Stop-specific service OR route-wide service (null = applies to all stops)
              (s.route_stop_id === stopId || s.route_stop_id === null) &&
              ['sender_dropoff', 'driver_pickup'].includes(s.service_type),
          )
        : [],
    [route],
  );

  const deliveryServices = route
    ? route.route_services.filter(
        (s) => s.route_stop_id === null &&
          ['recipient_collects', 'driver_delivery', 'local_post'].includes(s.service_type),
      )
    : [];

  const paymentMethods = route?.route_payment_methods ?? [];

  return {
    route,
    collectionStops,
    dropoffStops,
    collectionServicesForStop,
    deliveryServices,
    paymentMethods,
    isLoading,
    error,
    retry,
  };
}
