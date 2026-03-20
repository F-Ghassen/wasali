import { useRouter } from 'expo-router';
import { useSearchStore } from '@/stores/searchStore';

export function useRouteSearch() {
  const router = useRouter();
  const store = useSearchStore();

  const canSearch = !!store.fromCityId && !!store.toCityId;

  function handleSearch() {
    if (!canSearch) return;
    router.push({
      pathname: '/routes/results',
      params: {
        origin_city_id: store.fromCityId,
        destination_city_id: store.toCityId,
        depart_from_date: store.departFromDate,
      },
    } as any);
  }

  return {
    fromCityId: store.fromCityId,
    fromCityName: store.fromCityName,
    fromCountry: store.fromCountry,
    toCityId: store.toCityId,
    toCityName: store.toCityName,
    toCountry: store.toCountry,
    departFromDate: store.departFromDate,
    canSearch,
    setFromCity: store.setFromCity,
    setToCity: store.setToCity,
    setDepartFromDate: store.setDepartFromDate,
    handleSearch,
  };
}
