import { useMemo } from 'react';
import { useCitiesStore } from '@/stores/citiesStore';
import { formatDateShort } from '@/utils/formatters';
import { tripId } from '@/utils/reference';
import { STOP_TYPE } from '@/constants/stopTypes';
import type { RouteWithStops } from '@/types/models';

export interface DriverRouteCardData {
  tripId: string;
  originCityName: string;
  destinationCityName: string;
  departureDateLabel: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  promoActive: boolean;
  promoLabel: string;
  fillPct: number;
  filledKg: number;
  totalKg: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#16a34a', bg: 'rgba(22,163,74,0.10)'  },
  full:      { label: 'Full',      color: '#d97706', bg: 'rgba(217,119,6,0.10)'  },
  completed: { label: 'Completed', color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  expired:   { label: 'Expired',   color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.10)'  },
  draft:     { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
};

export function useDriverRouteCard(
  route: RouteWithStops,
): DriverRouteCardData {
  const cities = useCitiesStore((s) => s.cities);

  return useMemo(() => {
    const getCityName = (id: string | null | undefined) =>
      cities.find((c) => c.id === id)?.name ?? '';

    // Routes have no origin/destination columns — derive from stops:
    // first collection stop = origin, last dropoff stop = destination.
    const stops = route.route_stops ?? [];
    const byOrder = (a: { stop_order: number }, b: { stop_order: number }) => a.stop_order - b.stop_order;
    const collectionStops = stops.filter((st) => st.stop_type === STOP_TYPE.COLLECTION).sort(byOrder);
    const dropoffStops = stops.filter((st) => st.stop_type === STOP_TYPE.DROPOFF).sort(byOrder);
    const originCityName      = getCityName(collectionStops[0]?.city_id);
    const destinationCityName = getCityName(dropoffStops[dropoffStops.length - 1]?.city_id);
    const departureDateLabel  = formatDateShort(route.departure_date);

    const statusCfg = STATUS_CONFIG[route.status] ?? STATUS_CONFIG.active;

    const now = new Date();
    // Canonical promo source is promotion_percentage/promotion_active (migration 043);
    // promo_label/promo_expires_at remain display/expiry metadata.
    const promoActive =
      !!route.promotion_active &&
      route.promotion_percentage != null &&
      (route.promo_expires_at == null || new Date(route.promo_expires_at) >= now);

    const promoLabel = promoActive
      ? (route.promo_label ?? `${route.promotion_percentage}% off`)
      : '';

    const totalKg  = route.available_weight_kg; // available is what's left; total not in this type
    const filledKg = 0; // no total_weight_kg on RouteWithStops; show available only
    const fillPct  = 0;

    return {
      tripId: tripId(route.id),
      originCityName,
      destinationCityName,
      departureDateLabel,
      statusLabel: statusCfg.label,
      statusColor: statusCfg.color,
      statusBg:    statusCfg.bg,
      promoActive,
      promoLabel,
      fillPct,
      filledKg,
      totalKg,
    };
  }, [route, cities]);
}
