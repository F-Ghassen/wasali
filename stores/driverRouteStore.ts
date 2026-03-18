import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops, RouteStatus, RouteTemplate } from '@/types/models';
import type { Update } from '@/types/database';
import type { WizardStep1Values, WizardStep4Values } from '@/utils/validators';

type RouteFilter = 'active' | 'completed' | 'cancelled' | 'all';

interface StopInput {
  city: string;
  country: string;
  stop_order: number;
  stop_type: 'collection' | 'dropoff';
  arrival_date?: string | null;
  meeting_point_url?: string | null;
  is_pickup_available: boolean;
  is_dropoff_available: boolean;
}

interface CreateRouteInput {
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  estimated_arrival_date?: string | null;
  available_weight_kg: number;
  min_weight_kg?: number;
  price_per_kg_eur: number;
  notes?: string | null;
  payment_methods?: string[];
  promo_discount_pct?: number | null;
  promo_expires_at?: string | null;
  promo_label?: string | null;
  stops?: StopInput[];
  logistics_options?: { type: 'collection' | 'delivery'; key: string; price_eur: number }[];
  prohibited_items?: string[];
  save_as_template?: boolean;
  template_name?: string;
}

interface DriverRouteState {
  routes: RouteWithStops[];
  templates: RouteTemplate[];
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
  fetchTemplates: (driverId: string) => Promise<void>;
  applyTemplate: (templateId: string) => Partial<WizardStep1Values & WizardStep4Values> | null;
  deleteTemplate: (templateId: string) => Promise<void>;
  clearError: () => void;
}

export const useDriverRouteStore = create<DriverRouteState & DriverRouteActions>((set, get) => ({
  routes: [],
  templates: [],
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
      const routeInsert = {
        driver_id: driverId,
        origin_city: data.origin_city,
        origin_country: data.origin_country,
        destination_city: data.destination_city,
        destination_country: data.destination_country,
        departure_date: data.departure_date,
        estimated_arrival_date: data.estimated_arrival_date ?? null,
        available_weight_kg: data.available_weight_kg,
        min_weight_kg: data.min_weight_kg ?? 10,
        price_per_kg_eur: data.price_per_kg_eur,
        notes: data.notes ?? null,
        status: 'active',
        payment_methods: data.payment_methods ?? ['cash_sender', 'cash_recipient', 'paypal', 'bank_transfer'],
        promo_discount_pct: data.promo_discount_pct ?? null,
        promo_expires_at: data.promo_expires_at ?? null,
        promo_label: data.promo_label ?? null,
        logistics_options: data.logistics_options ?? [],
        prohibited_items: data.prohibited_items ?? [],
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
          stop_type: stop.stop_type,
          arrival_date: stop.arrival_date ?? null,
          meeting_point_url: stop.meeting_point_url ?? null,
          is_pickup_available: stop.stop_type === 'collection',
          is_dropoff_available: stop.stop_type === 'dropoff',
        }));
        const { error: stopsError } = await supabase.from('route_stops').insert(stopsInsert);
        if (stopsError) throw stopsError;
      }

      if (data.save_as_template && data.template_name) {
        const templateInsert = {
          driver_id: driverId,
          name: data.template_name,
          origin_city: data.origin_city,
          origin_country: data.origin_country,
          destination_city: data.destination_city,
          destination_country: data.destination_country,
          available_weight_kg: data.available_weight_kg,
          price_per_kg_eur: data.price_per_kg_eur,
          payment_methods: data.payment_methods ?? ['cash_sender', 'cash_recipient', 'paypal', 'bank_transfer'],
          notes: data.notes ?? null,
        };
        await (supabase as any).from('route_templates').insert(templateInsert);
      }

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

  fetchTemplates: async (driverId) => {
    try {
      const { data, error } = await (supabase as any)
        .from('route_templates')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ templates: (data ?? []) as RouteTemplate[] });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  applyTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return null;
    return {
      origin_city: template.origin_city,
      origin_country: template.origin_country,
      destination_city: template.destination_city,
      destination_country: template.destination_country,
      available_weight_kg: template.available_weight_kg,
      price_per_kg_eur: template.price_per_kg_eur,
      payment_methods: template.payment_methods,
      notes: template.notes ?? undefined,
    };
  },

  deleteTemplate: async (templateId) => {
    try {
      const { error } = await (supabase as any).from('route_templates').delete().eq('id', templateId);
      if (error) throw error;
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== templateId),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },
}));
