import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops, RouteStatus } from '@/types/models';
import type { Insert, Update } from '@/types/database';

type RouteFilter = 'active' | 'completed' | 'cancelled' | 'all';

interface CreateRouteInput {
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  estimated_arrival_date?: string | null;
  available_weight_kg: number;
  price_per_kg_eur: number;
  notes?: string | null;
  stops?: Array<{
    city: string;
    country: string;
    stop_order: number;
    arrival_date?: string | null;
    is_pickup_available: boolean;
    is_dropoff_available: boolean;
  }>;
}

interface DriverRouteState {
  routes: RouteWithStops[];
  isLoading: boolean;
  error: string | null;
}

interface DriverRouteActions {
  fetchRoutes: (driverId: string, filter?: RouteFilter) => Promise<void>;
  createRoute: (driverId: string, data: CreateRouteInput) => Promise<string>;
  updateRoute: (id: string, updates: Partial<CreateRouteInput>) => Promise<void>;
  cancelRoute: (id: string) => Promise<void>;
  markRouteFull: (id: string) => Promise<void>;
  completeRoute: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDriverRouteStore = create<DriverRouteState & DriverRouteActions>((set, get) => ({
  routes: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchRoutes: async (driverId, filter = 'all') => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('routes')
        .select('*, route_stops(*)')
        .eq('driver_id', driverId)
        .order('departure_date', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ routes: (data ?? []) as RouteWithStops[] });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createRoute: async (driverId, data) => {
    set({ isLoading: true, error: null });
    try {
      const routeInsert: Insert<'routes'> = {
        driver_id: driverId,
        origin_city: data.origin_city,
        origin_country: data.origin_country,
        destination_city: data.destination_city,
        destination_country: data.destination_country,
        departure_date: data.departure_date,
        estimated_arrival_date: data.estimated_arrival_date ?? null,
        available_weight_kg: data.available_weight_kg,
        price_per_kg_eur: data.price_per_kg_eur,
        notes: data.notes ?? null,
        status: 'active',
      };

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert(routeInsert)
        .select('id')
        .single();
      if (routeError) throw routeError;
      const routeId = (route as { id: string }).id;

      if (data.stops && data.stops.length > 0) {
        const stopsInsert = data.stops.map((stop) => ({
          route_id: routeId,
          city: stop.city,
          country: stop.country,
          stop_order: stop.stop_order,
          arrival_date: stop.arrival_date ?? null,
          is_pickup_available: stop.is_pickup_available,
          is_dropoff_available: stop.is_dropoff_available,
        }));
        const { error: stopsError } = await supabase.from('route_stops').insert(stopsInsert);
        if (stopsError) throw stopsError;
      }

      // Refresh list
      await get().fetchRoutes(driverId);
      return routeId;
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateRoute: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const routeUpdate: Update<'routes'> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.available_weight_kg !== undefined) routeUpdate.available_weight_kg = updates.available_weight_kg;
      if (updates.price_per_kg_eur !== undefined) routeUpdate.price_per_kg_eur = updates.price_per_kg_eur;
      if (updates.estimated_arrival_date !== undefined) routeUpdate.estimated_arrival_date = updates.estimated_arrival_date;
      if (updates.notes !== undefined) routeUpdate.notes = updates.notes;

      const { error } = await supabase.from('routes').update(routeUpdate).eq('id', id);
      if (error) throw error;

      set((state) => ({
        routes: state.routes.map((r) =>
          r.id === id ? { ...r, ...routeUpdate } : r
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelRoute: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status: 'cancelled' as RouteStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        routes: state.routes.map((r) =>
          r.id === id ? { ...r, status: 'cancelled' } : r
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  markRouteFull: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status: 'full' as RouteStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        routes: state.routes.map((r) =>
          r.id === id ? { ...r, status: 'full' } : r
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  completeRoute: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status: 'completed' as RouteStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        routes: state.routes.map((r) =>
          r.id === id ? { ...r, status: 'completed' } : r
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
}));
