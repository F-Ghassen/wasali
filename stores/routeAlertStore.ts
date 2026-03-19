import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type RouteAlert = Database['public']['Tables']['route_alerts']['Row'];

interface RouteAlertState {
  alerts: RouteAlert[];
  isLoading: boolean;
}

interface RouteAlertActions {
  fetchAlerts: (userId: string) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  updateAlert: (id: string, patch: Partial<Pick<RouteAlert, 'origin_city' | 'destination_city' | 'date_from'>>) => Promise<void>;
}

export const useRouteAlertStore = create<RouteAlertState & RouteAlertActions>((set) => ({
  alerts: [],
  isLoading: false,

  fetchAlerts: async (userId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ alerts: (data ?? []) as RouteAlert[] });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAlert: async (id) => {
    const { error } = await supabase.from('route_alerts').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
  },

  updateAlert: async (id, patch) => {
    const { data, error } = await supabase
      .from('route_alerts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }));
  },
}));
