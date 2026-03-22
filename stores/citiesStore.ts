import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface City {
  id: string;
  name: string;
  country: string;
  country_code: string;
  flag_emoji: string;
  is_active: boolean;
  coming_soon?: boolean;
  is_capital: boolean;
}

interface CitiesState {
  cities: City[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  // Derived data
  countries: string[];
  countryFlags: Record<string, string>;
  citiesByCountry: Record<string, City[]>;
  euCountries: string[];

  // Actions
  fetchCities: () => Promise<void>;
  getCitiesByCountry: (country: string) => City[];
  getCountryFlag: (country: string) => string;
  isEU: (country: string) => boolean;
}

// EU countries reference - business rule, not configuration
const EU_COUNTRIES = [
  'France',
  'Germany',
  'Italy',
  'Spain',
  'Poland',
  'Netherlands',
  'Belgium',
  'Austria',
  'Sweden',
  'Denmark',
  'Finland',
  'Ireland',
  'Portugal',
  'Greece',
  'Czech Republic',
  'Romania',
  'Hungary',
];

export const useCitiesStore = create<CitiesState>((set, get) => ({
  cities: [],
  isLoading: false,
  error: null,
  initialized: false,
  countries: [],
  countryFlags: {},
  citiesByCountry: {},
  euCountries: [],

  fetchCities: async () => {
    const state = get();
    if (state.initialized) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const cities: City[] = data || [];

      // Derive data
      const countries = Array.from(new Set(cities.map((c) => c.country))).sort();
      const countryFlags: Record<string, string> = {};
      const citiesByCountry: Record<string, City[]> = {};

      cities.forEach((city) => {
        // Build flags map
        if (!countryFlags[city.country]) {
          countryFlags[city.country] = city.flag_emoji || '🌍';
        }

        // Group cities by country
        if (!citiesByCountry[city.country]) {
          citiesByCountry[city.country] = [];
        }
        citiesByCountry[city.country].push(city);
      });

      // Sort cities within each country by name
      Object.keys(citiesByCountry).forEach((country) => {
        citiesByCountry[country].sort((a, b) => a.name.localeCompare(b.name));
      });

      const euCountries = countries.filter((c) => EU_COUNTRIES.includes(c));

      set({
        cities,
        countries,
        countryFlags,
        citiesByCountry,
        euCountries,
        initialized: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch cities',
        isLoading: false,
      });
    }
  },

  getCitiesByCountry: (country: string) => {
    return get().citiesByCountry[country] || [];
  },

  getCountryFlag: (country: string) => {
    return get().countryFlags[country] || '🌍';
  },

  isEU: (country: string) => {
    return EU_COUNTRIES.includes(country);
  },
}));
