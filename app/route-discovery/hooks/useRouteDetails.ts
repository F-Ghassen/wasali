import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RouteStop {
  id: string;
  city_id: string;
  arrival_date: string | null;
  stop_type: string;
  stop_order: number | null;
  location_name: string | null;
  location_address: string | null;
  is_pickup_available: boolean;
  is_dropoff_available: boolean;
  meeting_point_url: string | null;
}

interface RouteService {
  id: string;
  route_stop_id: string | null;
  service_type: string;
  price_eur: number;
  location_name: string | null;
  location_address: string | null;
  instructions: string | null;
}

interface RoutePaymentMethod {
  id: string;
  payment_type: string;
  enabled: boolean;
}

export interface RouteDetail {
  id: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  available_weight_kg: number;
  price_per_kg_eur: number;
  promotion_percentage: number | null;
  promotion_active: boolean;
  prohibited_items: string[];
  driver: {
    id: string;
    full_name: string | null;
    phone: string | null;
    phone_verified: boolean;
    rating: number;
    completed_trips: number;
  } | null;
  route_stops: RouteStop[];
  route_services: RouteService[];
  route_payment_methods: RoutePaymentMethod[];
  cityNames: Record<string, string>;
}

export function useRouteDetails(routeId: string, enabled: boolean) {
  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !routeId || routeDetail?.id === routeId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      const { data, error: fetchError } = await supabase
        .from('routes')
        .select(`
          id,
          departure_date, estimated_arrival_date,
          available_weight_kg, price_per_kg_eur,
          promotion_percentage, promotion_active, prohibited_items,
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
        .single();

      if (cancelled) return;

      if (fetchError || !data) {
        setError('Could not load route details.');
        setIsLoading(false);
        return;
      }

      const cityIds = (data.route_stops as RouteStop[])
        .map((s) => s.city_id)
        .filter(Boolean);

      let cityNames: Record<string, string> = {};
      if (cityIds.length > 0) {
        const { data: citiesData } = await supabase
          .from('cities')
          .select('id, name')
          .in('id', cityIds);
        citiesData?.forEach((c: { id: string; name: string }) => {
          cityNames[c.id] = c.name;
        });
      }

      if (!cancelled) {
        setRouteDetail({ ...(data as unknown as RouteDetail), cityNames });
        setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [routeId, enabled]);

  // Reset when routeId changes
  useEffect(() => {
    setRouteDetail(null);
  }, [routeId]);

  return { routeDetail, isLoading, error };
}
