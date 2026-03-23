import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDate, formatPrice } from '@/utils/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BookingWithRoute } from '@/types/models';
import type { BookingStatus } from '@/constants/bookingStatus';

interface BookingCardProps {
  booking: BookingWithRoute;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const route = booking.route;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View>
          <Text style={styles.route}>
            {route?.origin_city_id ?? '—'} → {route?.destination_city_id ?? '—'}
          </Text>
          <Text style={styles.date}>
            {route?.departure_date ? formatDate(route.departure_date) : '—'}
          </Text>
        </View>
        <StatusBadge status={booking.status as BookingStatus} />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View>
          <Text style={styles.metaLabel}>Weight</Text>
          <Text style={styles.metaValue}>{booking.package_weight_kg} kg</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Category</Text>
          <Text style={styles.metaValue}>{booking.package_category}</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Total</Text>
          <Text style={[styles.metaValue, styles.price]}>{formatPrice(booking.price_eur)}</Text>
        </View>
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
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  route: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  date: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  metaValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  price: { color: Colors.primary },
});
