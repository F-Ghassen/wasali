import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EU_ORIGIN_CITIES, TN_DESTINATION_CITIES } from '@/constants/cities';

export type CityRow = {
  id: string;
  name: string;
  country: string;
  country_code: string;
  flag_emoji: string;
  coming_soon: boolean;
};

function fallbackCities(): CityRow[] {
  return [...EU_ORIGIN_CITIES, ...TN_DESTINATION_CITIES].map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    country_code: c.countryCode,
    flag_emoji: c.flag,
    coming_soon: false,
  }));
}

export function useCities() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('cities')
      .select('id, name, country, country_code, flag_emoji, coming_soon')
      .eq('is_active', true)
      .order('country')
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setCities(fallbackCities());
        } else {
          setCities(data as CityRow[]);
        }
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const citiesByCountry: Record<string, CityRow[]> = {};
  for (const city of cities) {
    if (!citiesByCountry[city.country]) citiesByCountry[city.country] = [];
    citiesByCountry[city.country].push(city);
  }

  const selectableCities = cities.filter((c) => !c.coming_soon);
  const comingSoonCities = cities.filter((c) => c.coming_soon);

  const getCityById = useCallback(
    (id: string) => cities.find((c) => c.id === id),
    [cities],
  );

  const getCityByName = useCallback(
    (name: string, country?: string) =>
      cities.find((c) =>
        c.name === name && (country == null || c.country === country),
      ),
    [cities],
  );

  return {
    cities,
    citiesByCountry,
    selectableCities,
    comingSoonCities,
    isLoading,
    getCityById,
    getCityByName,
  };
}
