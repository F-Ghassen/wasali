import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDate, formatPrice } from '@/utils/formatters';
import type { RouteWithStops } from '@/types/models';

interface RouteCardProps {
  route: RouteWithStops;
  onPress: () => void;
}

export function RouteCard({ route, onPress }: RouteCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={styles.routeInfo}>
          <View style={styles.cityRow}>
            <Text style={styles.city}>{route.origin_city}</Text>
            <Text style={styles.arrow}> → </Text>
            <Text style={styles.city}>{route.destination_city}</Text>
          </View>
          <Text style={styles.country}>
            {route.origin_country} → {route.destination_country}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatPrice(route.price_per_kg_eur)}</Text>
          <Text style={styles.perKg}>/kg</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Departure</Text>
          <Text style={styles.metaValue}>{formatDate(route.departure_date)}</Text>
        </View>
        {route.estimated_arrival_date && (
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Est. Arrival</Text>
            <Text style={styles.metaValue}>{formatDate(route.estimated_arrival_date)}</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Available</Text>
          <Text style={styles.metaValue}>{route.available_weight_kg} kg</Text>
        </View>
      </View>

      <View style={styles.bookButton}>
        <Text style={styles.bookButtonText}>Book Space</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeInfo: { flex: 1 },
  cityRow: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  arrow: { fontSize: FontSize.lg, color: Colors.primary },
  country: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.primary },
  perKg: { fontSize: FontSize.sm, color: Colors.text.secondary },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.md },
  meta: { flex: 1 },
  metaLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  metaValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  bookButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  bookButtonText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },
});
