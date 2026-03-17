import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { RouteWithStops } from '@/types/models';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: Colors.success, bg: Colors.successLight },
  full: { label: 'Full', color: Colors.warning, bg: Colors.warningLight },
  completed: { label: 'Completed', color: Colors.text.secondary, bg: Colors.background.secondary },
  cancelled: { label: 'Cancelled', color: Colors.error, bg: Colors.errorLight },
};

interface DriverRouteCardProps {
  route: RouteWithStops;
  bookingCount?: number;
  onPress?: () => void;
}

export function DriverRouteCard({ route, bookingCount = 0, onPress }: DriverRouteCardProps) {
  const statusCfg = STATUS_CONFIG[route.status] ?? STATUS_CONFIG.active;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Route header */}
      <View style={styles.header}>
        <View style={styles.route}>
          <MapPin size={16} color={Colors.text.secondary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {route.origin_city} → {route.destination_city}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Date and capacity */}
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {format(new Date(route.departure_date), 'MMM d, yyyy')}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>€{route.price_per_kg_eur}/kg</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</Text>
      </View>

      {/* Capacity bar */}
      <View style={styles.capacityRow}>
        <Text style={styles.capacityLabel}>Available capacity</Text>
        <Text style={styles.capacityValue}>{route.available_weight_kg} kg</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {route.origin_country} → {route.destination_country}
        </Text>
        <ChevronRight size={16} color={Colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  route: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  routeText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  dot: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  capacityLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  capacityValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerHint: { fontSize: FontSize.xs, color: Colors.text.tertiary },
});
