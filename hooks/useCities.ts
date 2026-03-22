import { useCallback, useMemo } from 'react';
import { useCitiesStore } from '@/stores/citiesStore';

export type CityRow = {
  id: string;
  name: string;
  country: string;
  country_code: string;
  flag_emoji: string;
  coming_soon?: boolean;
};

export function useCities() {
  const { cities, isLoading, citiesByCountry } = useCitiesStore();

  // Map store format to hook format
  const mappedCities: CityRow[] = useMemo(
    () =>
      cities.map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        country_code: c.country_code,
        flag_emoji: c.flag_emoji,
        coming_soon: c.coming_soon || false,
      })),
    [cities],
  );

  const mappedCitiesByCountry: Record<string, CityRow[]> = useMemo(
    () =>
      Object.entries(citiesByCountry).reduce(
        (acc, [country, storeCities]) => {
          acc[country] = storeCities.map((c) => ({
            id: c.id,
            name: c.name,
            country: c.country,
            country_code: c.country_code,
            flag_emoji: c.flag_emoji,
            coming_soon: c.coming_soon || false,
          }));
          return acc;
        },
        {} as Record<string, CityRow[]>,
      ),
    [citiesByCountry],
  );

  const selectableCities = useMemo(
    () => mappedCities.filter((c) => !c.coming_soon),
    [mappedCities],
  );

  const comingSoonCities = useMemo(
    () => mappedCities.filter((c) => c.coming_soon),
    [mappedCities],
  );

  const getCityById = useCallback(
    (id: string) => mappedCities.find((c) => c.id === id),
    [mappedCities],
  );

  const getCityByName = useCallback(
    (name: string, country?: string) =>
      mappedCities.find(
        (c) => c.name === name && (country == null || c.country === country),
      ),
    [mappedCities],
  );

  return {
    cities: mappedCities,
    citiesByCountry: mappedCitiesByCountry,
    selectableCities,
    comingSoonCities,
    isLoading,
    getCityById,
    getCityByName,
  };
}
