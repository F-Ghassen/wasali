import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ImageBackground,
  ViewStyle,
} from 'react-native';
import {
  MapPin,
  Clock,
  Package,
  BadgeCheck,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useCitiesStore } from '@/stores/citiesStore';
import type { RouteWithStops } from '@/types/models';

export type RouteCardRoute = Omit<Partial<RouteWithStops>, 'driver'> & {
  id: string;
  origin_country?: string;
  destination_country?: string;
  departure_date: string;
  available_weight_kg: number;
  price_per_kg_eur: number;
  route_stops?: any[];
  total_weight_kg?: number;
  min_booking_kg?: number;
  promotion_percentage?: number | null;
  promotion_active?: boolean;
  driver_verified?: boolean;
  forbidden_items?: string[];
  origin_city_id?: string | null;
  destination_city_id?: string | null;
  estimated_arrival_date?: string | null;
  driver?: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone_verified?: boolean;
    rating?: number;
    completed_trips?: number;
  } | null;
};

interface RouteCardProps {
  route: RouteCardRoute;
  onPress: () => void;
  serviceTags?: { type: string; price_eur: number }[];
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function effectivePrice(route: RouteCardRoute): number {
  return route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;
}

export function RouteCard({ route, onPress, serviceTags }: RouteCardProps) {
  const cities = useCitiesStore((s) => s.cities);

  const getCityName = (cityId: string) => {
    return cities.find((c) => c.id === cityId)?.name || '';
  };

  const originCityName = useMemo(() => {
    return route.origin_city_id ? getCityName(route.origin_city_id) : '';
  }, [route.origin_city_id, cities]);

  const destinationCityName = useMemo(() => {
    return route.destination_city_id ? getCityName(route.destination_city_id) : '';
  }, [route.destination_city_id, cities]);

  const total = route.total_weight_kg ?? route.available_weight_kg;
  const filled = total - route.available_weight_kg;
  const fillPct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;

  const hasPromo = !!route.promotion_active && !!route.promotion_percentage;
  const discountedPrice = hasPromo ? effectivePrice(route) : null;

  const driverRating = route.driver?.rating ?? 0;
  const driverTripCount = route.driver?.completed_trips ?? 0;
  const driverVerified = route.driver?.phone_verified ?? route.driver_verified;

  // Format dates
  const departureDate = formatDateShort(route.departure_date);
  const arrivalDate = route.estimated_arrival_date
    ? formatDateShort(route.estimated_arrival_date)
    : null;

  // Day difference
  const depDate = new Date(route.departure_date);
  const arrDate = route.estimated_arrival_date ? new Date(route.estimated_arrival_date) : null;
  const daysDiff = arrDate
    ? Math.ceil((arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysLabel = daysDiff === 0 ? 'Same day' : daysDiff === 1 ? '1 day' : `${daysDiff} days`;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* ── Header: Driver + Price ────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Driver Info */}
        <View style={s.driverSection}>
          {/* Avatar */}
          <View style={s.avatarContainer}>
            <Text style={s.avatarText}>{initials(route.driver?.full_name)}</Text>
          </View>

          {/* Driver Details */}
          <View style={s.driverMeta}>
            <View style={s.driverNameRow}>
              <Text style={s.driverName}>{route.driver?.full_name ?? 'Driver'}</Text>
              {driverVerified && (
                <BadgeCheck size={14} color={Colors.secondary} strokeWidth={2.5} />
              )}
            </View>

            {driverRating > 0 ? (
              <View style={s.driverStats}>
                <Text style={s.driverStat}>⭐ {driverRating.toFixed(1)}</Text>
                <Text style={s.driverDot}>·</Text>
                <Text style={s.driverStat}>{driverTripCount} trips</Text>
              </View>
            ) : (
              <Text style={s.driverNew}>New driver</Text>
            )}
          </View>
        </View>

        {/* Price Badge */}
        <View style={s.priceDisplay}>
          {hasPromo && (
            <Text style={s.originalPrice}>€{route.price_per_kg_eur.toFixed(2)}</Text>
          )}
          <Text style={s.mainPrice}>
            €{(discountedPrice ?? route.price_per_kg_eur).toFixed(2)}
          </Text>
          <Text style={s.priceUnit}>/kg</Text>

          {hasPromo && (
            <View style={s.promoBadge}>
              <Text style={s.promoText}>−{route.promotion_percentage}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Route Summary: From → To ──────────────────────────────────────────── */}
      <View style={s.routeSection}>
        <View style={s.routeEndpoint}>
          <View style={s.locationDot} />
          <View style={s.endpointText}>
            <Text style={s.city}>{originCityName}</Text>
            <View style={s.dateRow}>
              <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
              <Text style={s.date}>{departureDate}</Text>
            </View>
          </View>
        </View>

        {/* Route Line */}
        <View style={s.routeLine}>
          <View style={s.routeLineInner} />
          {daysDiff !== null && (
            <View style={s.daysBadge}>
              <Text style={s.daysText}>{daysLabel}</Text>
            </View>
          )}
        </View>

        <View style={s.routeEndpoint}>
          <View style={[s.locationDot, s.locationDotEnd]} />
          <View style={s.endpointText}>
            <Text style={s.city}>{destinationCityName}</Text>
            {arrivalDate && (
              <View style={s.dateRow}>
                <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
                <Text style={s.date}>{arrivalDate}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Capacity Bar with Label ───────────────────────────────────────────── */}
      <View style={s.capacitySection}>
        <View style={s.capacityHeader}>
          <View style={s.capacityLabel}>
            <Package size={14} color={Colors.text.secondary} strokeWidth={2} />
            <Text style={s.capacityText}>Capacity</Text>
          </View>
          <Text style={s.capacityValue}>
            {route.available_weight_kg}
            <Text style={s.capacityMax}> / {total} kg</Text>
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={s.barBg}>
          <View
            style={[
              s.barFill,
              { width: `${Math.max(fillPct, 5)}%` as any }, // Min 5% visible
            ]}
          />
        </View>

        {/* Status Text */}
        <Text style={s.capacityStatus}>
          {route.available_weight_kg > 0
            ? `${Math.round(fillPct)}% filled`
            : 'Full'}
        </Text>
      </View>

      {/* ── Service Tags ──────────────────────────────────────────────────────── */}
      {serviceTags && serviceTags.length > 0 && (
        <View style={s.serviceTags}>
          {serviceTags.map((tag, idx) => (
            <View key={idx} style={s.serviceTag}>
              <Text style={s.serviceTagText}>{tag.type}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── CTA Button ────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={s.cta} onPress={onPress} activeOpacity={0.8}>
        <Text style={s.ctaText}>Book this slot →</Text>
        <ChevronRight size={18} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // ── Main Card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  // ── Header: Driver + Price ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },

  driverSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },

  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },

  driverMeta: {
    flex: 1,
    justifyContent: 'center',
  },

  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 3,
  },

  driverName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  driverStat: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  driverDot: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },

  driverNew: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },

  // Price Display
  priceDisplay: {
    alignItems: 'flex-end',
    gap: 2,
  },

  mainPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },

  priceUnit: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  originalPrice: {
    fontSize: 11,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },

  promoBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
  },

  promoText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },

  // ── Route Section ──────────────────────────────────────────────────────────
  routeSection: {
    marginBottom: Spacing.lg,
  },

  routeEndpoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },

  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },

  locationDotEnd: {
    backgroundColor: Colors.primary,
  },

  endpointText: {
    flex: 1,
    gap: 4,
  },

  city: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  date: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },

  routeLine: {
    width: 2,
    marginLeft: 5,
    marginVertical: Spacing.sm,
    alignItems: 'center',
    minHeight: 40,
    position: 'relative',
  },

  routeLineInner: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },

  daysBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    position: 'absolute',
  },

  daysText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },

  // ── Capacity Section ───────────────────────────────────────────────────────
  capacitySection: {
    backgroundColor: 'rgba(99,102,241,0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },

  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  capacityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  capacityText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  capacityValue: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  capacityMax: {
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  barBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },

  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  capacityStatus: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // ── Service Tags Section ──────────────────────────────────────────────────
  serviceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },

  serviceTag: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },

  serviceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ── CTA Button ─────────────────────────────────────────────────────────────
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  ctaText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
  },
});
