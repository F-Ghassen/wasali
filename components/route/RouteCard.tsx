import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ShieldCheck, Ban } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import type { RouteWithStops } from '@/types/models';

// Extended type — real DB fields + optional UI extras
export type RouteCardRoute = RouteWithStops & {
  total_weight_kg?: number;
  min_booking_kg?: number;
  promotion_percentage?: number | null;
  promotion_active?: boolean;
  driver_verified?: boolean;
  forbidden_items?: string[];
  // driver joined from Supabase query
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
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function serviceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    sender_dropoff:     'Drop-off',
    driver_pickup:      'Driver pickup',
    recipient_collects: 'Self-collect',
    driver_delivery:    'Home delivery',
    local_post:         'Post',
  };
  return map[type] ?? type;
}

function effectivePrice(route: RouteCardRoute): number {
  return route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;
}

export function RouteCard({ route, onPress, serviceTags }: RouteCardProps) {
  const pickupStops  = route.route_stops.filter(
    (s) => s.is_pickup_available && s.city !== route.origin_city,
  );
  const dropoffStops = route.route_stops.filter(
    (s) => s.is_dropoff_available && s.city !== route.destination_city,
  );

  // Capacity
  const total     = route.total_weight_kg ?? route.available_weight_kg;
  const filled    = total - route.available_weight_kg;
  const fillPct   = total > 0 ? Math.min((filled / total) * 100, 100) : 0;

  const hasPromo = !!route.promotion_active && !!route.promotion_percentage;
  const discountedPrice = hasPromo ? effectivePrice(route) : null;

  const driverRating       = route.driver?.rating ?? 0;
  const driverTripCount    = route.driver?.completed_trips ?? 0;
  const driverIsNew        = driverRating === 0;
  const driverVerified     = route.driver?.phone_verified ?? route.driver_verified;
  const vehicleType        = (route as any).vehicle_type as string | null | undefined;

  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.85}>

      {/* ── Driver row ───────────────────────────────────── */}
      <View style={c.driverRow}>
        <View style={c.avatar}>
          <Text style={c.avatarText}>{initials(route.driver?.full_name)}</Text>
        </View>

        <View style={c.driverInfo}>
          <View style={c.driverNameRow}>
            <Text style={c.driverName}>{route.driver?.full_name ?? 'Driver'}</Text>
            {driverVerified && (
              <ShieldCheck size={14} color={Colors.secondary} strokeWidth={2.5} />
            )}
            {vehicleType && (
              <View style={c.vehiclePill}>
                <Text style={c.vehicleText}>{vehicleType}</Text>
              </View>
            )}
          </View>
          <Text style={c.driverMeta}>
            ⭐ {driverRating.toFixed(1)} · {driverTripCount} trip{driverTripCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {hasPromo && (
          <View style={c.promoBadge}>
            <Text style={c.promoText}>−{route.promotion_percentage}%</Text>
          </View>
        )}
      </View>

      {/* ── Stop pills ──────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={c.pillsRow}
      >
        <View style={c.pillGroup}>
          <View style={[c.pill, c.pickupPill]}>
            <Text style={[c.pillCity, c.pickupText]}>{route.origin_city}</Text>
            <Text style={[c.pillDate, c.pickupText]}>{formatDateShort(route.departure_date)}</Text>
          </View>
          {pickupStops.map((s) => (
            <View key={s.id} style={[c.pill, c.pickupPill]}>
              <Text style={[c.pillCity, c.pickupText]}>{s.city}</Text>
              {s.arrival_date && (
                <Text style={[c.pillDate, c.pickupText]}>{formatDateShort(s.arrival_date)}</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={c.pillArrow}>→</Text>

        <View style={c.pillGroup}>
          {dropoffStops.map((s) => (
            <View key={s.id} style={[c.pill, c.dropoffPill]}>
              <Text style={[c.pillCity, c.dropoffText]}>{s.city}</Text>
              {s.arrival_date && (
                <Text style={[c.pillDate, c.dropoffText]}>{formatDateShort(s.arrival_date)}</Text>
              )}
            </View>
          ))}
          <View style={[c.pill, c.dropoffPill]}>
            <Text style={[c.pillCity, c.dropoffText]}>{route.destination_city}</Text>
            {route.estimated_arrival_date && (
              <Text style={[c.pillDate, c.dropoffText]}>{formatDateShort(route.estimated_arrival_date)}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Capacity bar ────────────────────────────────── */}
      <View style={c.capacityRow}>
        <View style={c.bar}>
          <View style={[c.barFill, { width: `${fillPct}%` as any }]} />
        </View>
        <Text style={c.capacityLabel}>
          {filled > 0 ? `${filled}` : '0'}/{total} kg · <Text style={c.kgLeft}>{route.available_weight_kg} kg left</Text>
        </Text>
      </View>

      {/* ── Min booking ──────────────────────────────────── */}
      {route.min_booking_kg != null && (
        <View style={c.minKgBadge}>
          <Text style={c.minKgText}>📦 Minimum booking: {route.min_booking_kg} kg</Text>
        </View>
      )}

      {/* ── Forbidden items ──────────────────────────────── */}
      {!!route.forbidden_items?.length && (
        <View style={c.forbiddenRow}>
          <Ban size={12} color={Colors.error} strokeWidth={2.5} />
          <Text style={c.forbiddenLabel}>Not accepted:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={c.forbiddenScroll}>
            {route.forbidden_items.map((item) => (
              <View key={item} style={c.forbiddenPill}>
                <Text style={c.forbiddenPillText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Service tags ─────────────────────────────────── */}
      {!!serviceTags?.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={c.serviceTagsRow}
        >
          {serviceTags.map((tag, i) => (
            <View key={i} style={c.serviceTag}>
              <Text style={c.serviceTagText}>
                {serviceTypeLabel(tag.type)}
                {tag.price_eur === 0 ? ' · Free' : ` · +€${tag.price_eur}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Price + CTA ─────────────────────────────────── */}
      <View style={c.footer}>
        <View style={c.priceBlock}>
          <View style={c.priceRow}>
            {hasPromo && (
              <Text style={c.originalPrice}>€{route.price_per_kg_eur.toFixed(2)}</Text>
            )}
            <Text style={c.price}>
              from €{(discountedPrice ?? route.price_per_kg_eur).toFixed(2)}
              <Text style={c.perKg}>/kg</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity style={c.bookBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={c.bookBtnText}>Book slot →</Text>
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );
}

// ─── Pill colours ─────────────────────────────────────────────────────────────
const PICKUP_BG    = 'rgba(255,192,67,0.14)';
const PICKUP_TEXT  = '#9A6700';
const DROPOFF_BG   = 'rgba(5,148,79,0.10)';
const DROPOFF_TEXT = '#037840';

const c = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text.primary },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  driverName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  driverMeta: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  driverNew: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: '600', marginTop: 2 },
  promoBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  promoText: { fontSize: 11, fontWeight: '800', color: Colors.white },

  // Vehicle
  vehiclePill: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  vehicleText: { fontSize: 10, fontWeight: '600', color: Colors.text.secondary },

  // Pills
  pillsRow: { gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.md },
  pillGroup: { flexDirection: 'row', gap: Spacing.xs },
  pill: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignItems: 'center' },
  pickupPill:  { backgroundColor: PICKUP_BG },
  dropoffPill: { backgroundColor: DROPOFF_BG },
  pillCity: { fontSize: 11, fontWeight: '700' },
  pillDate: { fontSize: 10, marginTop: 1 },
  pickupText:  { color: PICKUP_TEXT },
  dropoffText: { color: DROPOFF_TEXT },
  pillArrow: { fontSize: FontSize.base, color: Colors.text.tertiary, marginHorizontal: Spacing.xs },

  // Capacity
  capacityRow: { gap: Spacing.xs, marginBottom: Spacing.md },
  bar: { height: 4, backgroundColor: Colors.background.tertiary, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.text.primary, borderRadius: 2 },
  capacityLabel: { fontSize: FontSize.xs, color: Colors.text.secondary },
  kgLeft: { fontWeight: '700', color: Colors.text.primary },

  // Min booking
  minKgBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(39,110,241,0.09)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(39,110,241,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginBottom: Spacing.sm,
  },
  minKgText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.secondary },

  // Forbidden items
  forbiddenRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.md, flexWrap: 'nowrap',
  },
  forbiddenLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.error, flexShrink: 0 },
  forbiddenScroll: { gap: Spacing.xs, flexDirection: 'row' },
  forbiddenPill: {
    backgroundColor: 'rgba(225,25,0,0.07)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  forbiddenPillText: { fontSize: 11, fontWeight: '600', color: Colors.error },

  // Service tags
  serviceTagsRow: { gap: Spacing.xs, marginBottom: Spacing.sm },
  serviceTag: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  serviceTagText: { fontSize: 11, fontWeight: '500', color: Colors.text.secondary },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceBlock: { gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  originalPrice: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  price: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text.primary },
  perKg: { fontSize: FontSize.xs, fontWeight: '400', color: Colors.text.secondary },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  bookBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
