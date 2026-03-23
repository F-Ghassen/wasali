import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Package, ExternalLink } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { Button } from '@/components/ui/Button';
import { DriverBookingCard } from '@/components/driver/DriverBookingCard';
import type { RouteWithStops } from '@/types/models';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_sender: 'Cash on collection',
  cash_recipient: 'Cash on delivery',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
};

export default function DriverRouteDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const { routes, cancelRoute, markRouteFull, completeRoute, isLoading } = useDriverRouteStore();
  const { bookings, fetchBookings, confirmBooking, rejectBooking, markInTransit, markDelivered, getRouteStats } = useDriverBookingStore();
  const { showToast } = useUIStore();
  const cities = useCitiesStore((s) => s.cities);

  const getCityName = (cityId: string) => cities.find((c) => c.id === cityId)?.name || '';
  const getCountry = (cityId: string) => cities.find((c) => c.id === cityId)?.country || '';

  const route = routes.find((r) => r.id === id) as RouteWithStops | undefined;
  const routeBookings = bookings.filter((b) => b.route_id === id);
  const hasActiveBookings = routeBookings.some((b) => ['confirmed', 'in_transit'].includes(b.status));

  const load = () => {
    if (profile) fetchBookings(profile.id);
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = () => {
    if (hasActiveBookings) {
      Alert.alert(t('routeDetail.alerts.cannotCancel'), t('routeDetail.alerts.cannotCancelMsg'));
      return;
    }
    Alert.alert(
      t('routeDetail.alerts.cancelTitle'),
      t('routeDetail.alerts.cancelMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('routeDetail.actions.cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRoute(id);
              showToast(t('routeDetail.toast.cancelled'), 'info');
              router.back();
            } catch {
              showToast(t('routeDetail.toast.cancelFailed'), 'error');
            }
          },
        },
      ]
    );
  };

  const handleMarkFull = () => {
    Alert.alert(t('routeDetail.alerts.markFullTitle'), t('routeDetail.alerts.markFullMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('routeDetail.actions.markFull'),
        onPress: async () => {
          try {
            await markRouteFull(id);
            showToast(t('routeDetail.toast.markedFull'), 'success');
          } catch {
            showToast(t('routeDetail.toast.updateFailed'), 'error');
          }
        },
      },
    ]);
  };

  if (!route) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>{t('routeDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{t('routeDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = route.status === 'active';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('routeDetail.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        contentContainerStyle={styles.content}
      >
        {/* Route summary card */}
        <View style={styles.card}>
          <View style={styles.routeHeader}>
            <MapPin size={18} color={Colors.text.secondary} />
            <Text style={styles.routeTitle}>
              Route
            </Text>
          </View>
          <Text style={styles.routeSubtitle}>
            Route
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('routeDetail.labels.departure')}</Text>
              <Text style={styles.metaValue}>{format(new Date(route.departure_date), 'MMM d, yyyy')}</Text>
            </View>
            {route.estimated_arrival_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('routeDetail.labels.arrival')}</Text>
                <Text style={styles.metaValue}>{format(new Date(route.estimated_arrival_date), 'MMM d, yyyy')}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('routeDetail.labels.capacity')}</Text>
              <Text style={styles.metaValue}>{route.available_weight_kg} kg</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('routeDetail.labels.pricePerKg')}</Text>
              <Text style={styles.metaValue}>€{route.price_per_kg_eur}</Text>
            </View>
          </View>

          {route.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{route.notes}</Text>
            </View>
          ) : null}

          {/* Payment methods */}
          {(route as any).payment_methods?.length > 0 && (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>Payment methods</Text>
              <Text style={styles.notesText}>
                {((route as any).payment_methods as string[])
                  .map((m) => PAYMENT_METHOD_LABELS[m] ?? m)
                  .join(' · ')}
              </Text>
            </View>
          )}

          {/* Promo */}
          {(route as any).promo_discount_pct != null &&
            ((route as any).promo_expires_at == null ||
              new Date((route as any).promo_expires_at) >= new Date()) && (
            <View style={styles.promoCard}>
              <Text style={styles.promoBadge}>
                {(route as any).promo_label || `${(route as any).promo_discount_pct}% off`}
              </Text>
              <Text style={styles.promoDetail}>
                Discounted price: €{(route.price_per_kg_eur * (1 - (route as any).promo_discount_pct / 100)).toFixed(2)}/kg
              </Text>
              {(route as any).promo_expires_at && (
                <Text style={styles.promoExpiry}>
                  Expires: {format(new Date((route as any).promo_expires_at), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Collection stops */}
        {route.route_stops?.filter((s) => (s as any).stop_type === 'collection' || !(s as any).stop_type).length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>{t('routeDetail.sections.collectionStops')}</Text>
            {route.route_stops
              .filter((s) => (s as any).stop_type === 'collection' || !(s as any).stop_type)
              .map((stop, idx) => (
                <View key={stop.id ?? idx} style={styles.stopRow}>
                  <MapPin size={14} color={Colors.text.tertiary} />
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopCity}>{getCityName(stop.city_id)}, {getCountry(stop.city_id)}</Text>
                    {(stop as any).arrival_date && (
                      <Text style={styles.stopDate}>
                        {format(new Date((stop as any).arrival_date), 'MMM d, yyyy')}
                      </Text>
                    )}
                    {(stop as any).meeting_point_url && (
                      <TouchableOpacity
                        style={styles.locationLink}
                        onPress={() => Linking.openURL((stop as any).meeting_point_url)}
                      >
                        <ExternalLink size={11} color={Colors.secondary} />
                        <Text style={styles.locationLinkText}>View location →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Drop-off stops */}
        {route.route_stops?.filter((s) => (s as any).stop_type === 'dropoff').length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>{t('routeDetail.sections.dropoffStops')}</Text>
            {route.route_stops
              .filter((s) => (s as any).stop_type === 'dropoff')
              .map((stop, idx) => (
                <View key={stop.id ?? idx} style={styles.stopRow}>
                  <MapPin size={14} color={Colors.text.tertiary} />
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopCity}>{getCityName(stop.city_id)}, {getCountry(stop.city_id)}</Text>
                    {(stop as any).arrival_date && (
                      <Text style={styles.stopDate}>
                        Est. arrival: {format(new Date((stop as any).arrival_date), 'MMM d, yyyy')}
                      </Text>
                    )}
                    {(stop as any).meeting_point_url && (
                      <TouchableOpacity
                        style={styles.locationLink}
                        onPress={() => Linking.openURL((stop as any).meeting_point_url)}
                      >
                        <ExternalLink size={11} color={Colors.secondary} />
                        <Text style={styles.locationLinkText}>View location →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Actions (only for active routes) */}
        {isActive && (
          <View style={styles.actionsCard}>
            <Button
              label={t('routeDetail.actions.markFull')}
              onPress={handleMarkFull}
              variant="outline"
              size="md"
            />
            <Button
              label={t('routeDetail.actions.cancel')}
              onPress={handleCancel}
              variant="destructive"
              size="md"
            />
          </View>
        )}

        {/* Analytics */}
        {(() => {
          const stats = getRouteStats(id);
          const capacity = route.available_weight_kg ?? 0;
          const pricePerKg = route.price_per_kg_eur ?? 0;
          const expectedGross = capacity * pricePerKg * 1.3;
          const actualGross = stats.deliveredRevenue * 1.3;
          const fillRate = capacity > 0 ? Math.min(stats.bookedKg / capacity, 1) : 0;
          const fillPct = Math.round(fillRate * 100);
          const fillBarCount = 10;
          const filledBars = Math.round(fillRate * fillBarCount);
          const isGoodActual = actualGross >= expectedGross;
          const isLowActual = !isGoodActual && actualGross < expectedGross * 0.8;
          return (
            <View style={styles.analyticsCard}>
              <Text style={styles.sectionTitle}>{t('routeDetail.sections.performance')}</Text>
              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>{t('routeDetail.analytics.expectedGross')}</Text>
                  <Text style={styles.analyticValue}>€{expectedGross.toFixed(0)}</Text>
                </View>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>{t('routeDetail.analytics.actualGross')}</Text>
                  <Text style={[
                    styles.analyticValue,
                    isGoodActual && styles.analyticGood,
                    isLowActual && styles.analyticLow,
                  ]}>€{actualGross.toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.fillRow}>
                <Text style={styles.analyticLabel}>{t('routeDetail.analytics.fillRate')}</Text>
                <View style={styles.fillBar}>
                  {Array.from({ length: fillBarCount }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.fillSegment, i < filledBars && styles.fillSegmentActive]}
                    />
                  ))}
                </View>
                <Text style={styles.analyticLabel}>{fillPct}%</Text>
              </View>
              <Text style={styles.analyticSub}>
                {stats.deliveredCount} booking{stats.deliveredCount !== 1 ? 's' : ''} delivered
              </Text>
            </View>
          );
        })()}

        {/* Bookings on this route */}
        <Text style={styles.sectionTitle}>
          {t('routeDetail.sections.bookings')} ({routeBookings.length})
        </Text>

        {routeBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Package size={32} color={Colors.text.tertiary} />
            <Text style={styles.emptyText}>{t('driverBookings.emptyAll')}</Text>
          </View>
        ) : (
          routeBookings.map((booking) => (
            <DriverBookingCard
              key={booking.id}
              booking={booking}
              onConfirm={booking.status === 'pending' ? () => confirmBooking(booking.id) : undefined}
              onReject={booking.status === 'pending' ? () => rejectBooking(booking.id) : undefined}
              onPress={() => router.push({ pathname: '/driver/bookings/[id]' as any, params: { id: booking.id } })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text.primary },
  routeSubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  metaItem: { minWidth: '40%' },
  metaLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  metaValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  notes: { marginTop: Spacing.sm },
  notesLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  notesText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  actionsCard: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
  },
  emptyText: { fontSize: FontSize.base, color: Colors.text.tertiary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FontSize.base, color: Colors.text.secondary },

  // Stops
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  stopInfo: { flex: 1 },
  stopCity: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  stopDate: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  locationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  locationLinkText: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: '600' },

  // Analytics
  analyticsCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  analyticRow: { flexDirection: 'row', gap: Spacing.md },
  analyticItem: { flex: 1 },
  analyticLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  analyticValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  analyticGood: { color: Colors.success },
  analyticLow: { color: Colors.warning },
  analyticSub: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  fillRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fillBar: { flex: 1, flexDirection: 'row', gap: 2 },
  fillSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.light,
  },
  fillSegmentActive: { backgroundColor: Colors.primary },

  // Promo card
  promoCard: {
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  promoBadge: { fontSize: FontSize.sm, fontWeight: '700', color: '#D97706', marginBottom: 2 },
  promoDetail: { fontSize: FontSize.xs, color: Colors.text.secondary },
  promoExpiry: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
});
