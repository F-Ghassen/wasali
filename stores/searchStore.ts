import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops } from '@/types/models';

interface SearchState {
  fromCity: string;
  fromCountry: string;
  toCity: string;
  toCountry: string;
  date: string | null;
  minWeight: number;
  results: RouteWithStops[];
  isSearching: boolean;
  hasSearched: boolean;
}

interface SearchActions {
  setFromCity: (city: string, country: string) => void;
  setToCity: (city: string, country: string) => void;
  setDate: (date: string | null) => void;
  setMinWeight: (weight: number) => void;
  search: () => Promise<void>;
  clearResults: () => void;
  reset: () => void;
}

const initialState: SearchState = {
  fromCity: '',
  fromCountry: '',
  toCity: '',
  toCountry: '',
  date: null,
  minWeight: 0,
  results: [],
  isSearching: false,
  hasSearched: false,
};

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  ...initialState,

  setFromCity: (city, country) => set({ fromCity: city, fromCountry: country }),
  setToCity: (city, country) => set({ toCity: city, toCountry: country }),
  setDate: (date) => set({ date }),
  setMinWeight: (minWeight) => set({ minWeight }),

  search: async () => {
    const { fromCity, toCity, date, minWeight } = get();
    if (!fromCity || !toCity) return;

    set({ isSearching: true, hasSearched: false });
    try {
      let query = supabase
        .from('routes')
        .select('*, route_stops(*)')
        .eq('origin_city', fromCity)
        .eq('destination_city', toCity)
        .eq('status', 'active')
        .gte('available_weight_kg', minWeight > 0 ? minWeight : 0)
        .order('departure_date', { ascending: true });

      if (date) {
        query = query.gte('departure_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ results: (data as RouteWithStops[]) ?? [], hasSearched: true });
    } finally {
      set({ isSearching: false });
    }
  },

  clearResults: () => set({ results: [], hasSearched: false }),
  reset: () => set(initialState),
}));
