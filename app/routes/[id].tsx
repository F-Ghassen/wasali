import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPrice } from '@/utils/formatters';
import { useBookingStore } from '@/stores/bookingStore';

export default function RouteDetailScreen() {
  const router = useRouter();
  const { selectedRoute } = useBookingStore();

  if (!selectedRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Route not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const route = selectedRoute;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.routeTitle}>
            {route.origin_city} → {route.destination_city}
          </Text>
          <Text style={styles.routeCountry}>
            {route.origin_country} → {route.destination_country}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Departure</Text>
            <Text style={styles.detailValue}>{formatDate(route.departure_date)}</Text>
          </View>
          {route.estimated_arrival_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Est. Arrival</Text>
              <Text style={styles.detailValue}>{formatDate(route.estimated_arrival_date)}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available Space</Text>
            <Text style={styles.detailValue}>{route.available_weight_kg} kg</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={[styles.detailValue, styles.price]}>
              {formatPrice(route.price_per_kg_eur)} / kg
            </Text>
          </View>
        </View>

        {route.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Notes</Text>
            <Text style={styles.notes}>{route.notes}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Book This Route"
          onPress={() => router.push('/booking/package-details')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base, gap: Spacing.base },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  routeTitle: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  routeCountry: { fontSize: FontSize.base, color: Colors.text.secondary, marginTop: 4 },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: { fontSize: FontSize.base, color: Colors.text.secondary },
  detailValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  price: { color: Colors.primary, fontSize: FontSize.lg },
  notes: { fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  footer: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.lg, color: Colors.text.secondary },
});
