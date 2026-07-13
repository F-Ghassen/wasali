import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Clock, Package, AlertCircle, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useSearchStore } from '@/stores/searchStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { STOP_TYPE } from '@/constants/stopTypes';
import { RoutePromoSection } from '@/components/routes/RoutePromoSection';
import { RouteTimelineSection } from '@/components/routes/RouteTimelineSection';
import { RouteCapacitySection } from '@/components/routes/RouteCapacitySection';
import { RoutePaymentSection } from '@/components/routes/RoutePaymentSection';
import { RouteRestrictionsSection } from '@/components/routes/RouteRestrictionsSection';
import { RouteDriverSection } from '@/components/routes/RouteDriverSection';

export default function RouteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedRoute, loadRouteById, isLoading } = useBookingStore();
  const cities = useCitiesStore((s) => s.cities);

  // Cold deep-link fallback: search results normally populate selectedRoute,
  // but on a direct link / cold start it's null — fetch it by id.
  useEffect(() => {
    if (id && (!selectedRoute || selectedRoute.id !== id)) {
      loadRouteById(id);
    }
  }, [id, selectedRoute, loadRouteById]);

  // Still fetching the route for a deep-link — show a spinner, not "not found".
  if (id && !selectedRoute && isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // The route should be set in bookingStore from search results (or fetched above)
  if (!selectedRoute || !id) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ChevronLeft size={24} color={Colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.title}>Route Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.errorContainer}>
          <AlertCircle size={48} color={Colors.error} strokeWidth={1.5} />
          <Text style={s.errorText}>Route not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.retryBtn}
          >
            <Text style={s.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getCityName = (cityId: string | null | undefined) => {
    if (!cityId) return '';
    return cities.find((c) => c.id === cityId)?.name || '';
  };
  const getCountry = (cityId: string | null | undefined) => {
    if (!cityId) return '';
    return cities.find((c) => c.id === cityId)?.country || '';
  };

  // Routes have no origin/destination columns — origin is the first collection
  // stop's city, destination is the last dropoff stop's city (route_stops -> cities).
  const stops = selectedRoute.route_stops ?? [];
  const byOrder = (a: { stop_order: number }, b: { stop_order: number }) => a.stop_order - b.stop_order;
  const collectionStops = stops.filter((st) => st.stop_type === STOP_TYPE.COLLECTION).sort(byOrder);
  const dropoffStops = stops.filter((st) => st.stop_type === STOP_TYPE.DROPOFF).sort(byOrder);
  const originCityId = collectionStops[0]?.city_id;
  const destCityId = dropoffStops[dropoffStops.length - 1]?.city_id;

  const originCity = getCityName(originCityId);
  const destCity = getCityName(destCityId);
  const originCountry = getCountry(originCityId);
  const destCountry = getCountry(destCityId);

  const total = selectedRoute.total_weight_kg ?? selectedRoute.available_weight_kg;
  const filled = total - selectedRoute.available_weight_kg;
  const fillPct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;

  const hasPromo = !!selectedRoute.promotion_active && !!selectedRoute.promotion_percentage;

  // Calculate days
  const depDate = new Date(selectedRoute.departure_date);
  const arrDate = selectedRoute.estimated_arrival_date ? new Date(selectedRoute.estimated_arrival_date) : null;
  const daysDiff = arrDate ? Math.ceil((arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const handleBooking = () => {
    router.push({
      pathname: '/(sender)/booking/bookingCreation',
      params: { routeId: selectedRoute.id },
    } as any);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={24} color={Colors.text.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.title}>Route Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Route Summary */}
        <View style={s.summaryCard}>
          <View style={s.routeRow}>
            <View style={s.cityBlock}>
              <Text style={s.cityLabel}>FROM</Text>
              <Text style={s.cityName}>{originCity}</Text>
              <Text style={s.country}>{originCountry}</Text>
            </View>

            <View style={s.arrowBlock}>
              <Text style={s.arrow}>→</Text>
              {daysDiff !== null && (
                <Text style={s.daysLabel}>{daysDiff === 0 ? 'Same day' : daysDiff === 1 ? '1 day' : `${daysDiff} days`}</Text>
              )}
            </View>

            <View style={s.cityBlock}>
              <Text style={s.cityLabel}>TO</Text>
              <Text style={s.cityName}>{destCity}</Text>
              <Text style={s.country}>{destCountry}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.priceRow}>
            <View>
              <Text style={s.priceLabel}>Price per kg</Text>
              {hasPromo && (
                <Text style={s.originalPrice}>€{selectedRoute.price_per_kg_eur.toFixed(2)}</Text>
              )}
              <Text style={s.mainPrice}>
                €{(hasPromo ? selectedRoute.price_per_kg_eur * (1 - selectedRoute.promotion_percentage! / 100) : selectedRoute.price_per_kg_eur).toFixed(2)}/kg
              </Text>
            </View>

            {selectedRoute.vehicle_type && (
              <View style={s.vehicleTag}>
                <Text style={s.vehicleText}>🚐 {selectedRoute.vehicle_type}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Promo Banner */}
        {hasPromo && <RoutePromoSection route={selectedRoute} />}

        {/* Capacity */}
        <RouteCapacitySection
          available={selectedRoute.available_weight_kg}
          total={total}
          minBooking={selectedRoute.min_weight_kg ?? undefined}
          maxSinglePackage={selectedRoute.max_single_package_kg ?? undefined}
        />

        {/* Timeline */}
        <RouteTimelineSection route={selectedRoute} cities={cities} />

        {/* Payment Methods */}
        {selectedRoute.payment_methods && selectedRoute.payment_methods.length > 0 && (
          <RoutePaymentSection methods={selectedRoute.payment_methods} />
        )}

        {/* Restrictions */}
        {selectedRoute.prohibited_items && selectedRoute.prohibited_items.length > 0 && (
          <RouteRestrictionsSection items={selectedRoute.prohibited_items} />
        )}

        {/* Driver */}
        <RouteDriverSection driver={selectedRoute.driver} onContact={() => {}} />

        {/* Bottom spacing */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Floating CTA */}
      <View style={s.footer}>
        <TouchableOpacity style={s.ctaButton} onPress={handleBooking}>
          <Text style={s.ctaText}>Book This Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cityBlock: {
    flex: 1,
  },

  cityLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  cityName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },

  country: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },

  arrowBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },

  arrow: {
    fontSize: 20,
    color: Colors.primary,
  },

  daysLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: Spacing.md,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priceLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 4,
  },

  mainPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },

  originalPrice: {
    fontSize: 11,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },

  vehicleTag: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  vehicleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },

  errorText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },

  retryText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
  },

  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: Colors.white,
  },

  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },

  ctaText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
  },
});
