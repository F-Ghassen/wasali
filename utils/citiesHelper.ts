import { useCitiesStore } from '@/stores/citiesStore';

export function getCityName(cityId: string | null | undefined): string {
  if (!cityId) return '';
  const cities = useCitiesStore.getState().cities;
  return cities.find((c) => c.id === cityId)?.name || '';
}

export function getCountry(cityId: string | null | undefined): string {
  if (!cityId) return '';
  const cities = useCitiesStore.getState().cities;
  return cities.find((c) => c.id === cityId)?.country || '';
}

export function getCityAndCountry(cityId: string | null | undefined): string {
  if (!cityId) return '';
  const cities = useCitiesStore.getState().cities;
  const city = cities.find((c) => c.id === cityId);
  if (!city) return '';
  return `${city.name}, ${city.country}`;
}
