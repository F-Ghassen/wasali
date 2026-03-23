import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { ArrowRight, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { FeaturedRoute } from '@/app/route-discovery/types/featured-route';

interface FeaturedRouteCardProps {
  route: FeaturedRoute;
  onBook: (routeId: string) => void;
}

export function FeaturedRouteCard({ route: r, onBook }: FeaturedRouteCardProps) {
  const { t } = useTranslation();

  const promotionLabel = r.pricePromotion ? `${r.pricePromotion}% off` : null;
  const effectivePrice = r.pricePromotion
    ? (r.pricePerKg * (1 - r.pricePromotion / 100)).toFixed(2)
    : r.pricePerKg.toFixed(2);

  const pickupStops  = r.stops.filter((s) => s.stopType === 'collection');
  const dropoffStops = r.stops.filter((s) => s.stopType === 'dropoff');

  return (
    <View style={s.card}>
      {/* Row 1: Driver + Price */}
      <View style={s.row1}>
        <View style={s.driverHighlight}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{r.driverName[0]}</Text>
          </View>
          <View style={s.driverMeta}>
            <Text style={s.driverName}>{r.driverName}</Text>
            {r.driverRating !== null ? (
              <Text style={s.trustSignal}>⭐ {r.driverRating.toFixed(1)} • {r.driverTrips} trips</Text>
            ) : (
              <Text style={s.trustSignal}>New driver</Text>
            )}
          </View>
        </View>

        <View style={s.priceHighlight}>
          <View style={s.priceDisplay}>
            <Text style={s.effectivePrice}>€{effectivePrice}</Text>
            <Text style={s.priceUnit}>/kg</Text>
          </View>
          {promotionLabel && (
            <View style={s.promotionBadge}>
              <Text style={s.promotionText}>{promotionLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 2: Route stops */}
      <View style={s.routeSummary}>
        <View style={s.countrySection}>
          <View style={s.countryHeader}>
            <View style={s.labelWithCountry}>
              <Text style={s.countrySectionLabel}>From</Text>
              <Text style={s.countryFlagSmall}>{r.fromFlag}</Text>
              <Text style={s.countryNameSmall}>{r.fromCountry}</Text>
            </View>
          </View>
          <View style={s.stopsList}>
            <View style={s.stopsLabelRow}>
              <Text style={s.stopsLabelIcon}>📍</Text>
              <Text style={s.stopsSubLabel}>Pickup Locations</Text>
            </View>
            {pickupStops.map((stop) => (
              <View key={`${stop.city_id}-${stop.stopOrder}`} style={s.stopChip}>
                <Text style={s.stopChipText}>
                  {stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.routeArrow}>
          <ArrowRight size={20} color={Colors.primary} strokeWidth={2} />
        </View>

        <View style={s.countrySection}>
          <View style={s.countryHeader}>
            <View style={s.labelWithCountry}>
              <Text style={s.countrySectionLabel}>To</Text>
              <Text style={s.countryFlagSmall}>{r.toFlag}</Text>
              <Text style={s.countryNameSmall}>{r.toCountry}</Text>
            </View>
          </View>
          <View style={s.stopsList}>
            <View style={s.stopsLabelRow}>
              <Text style={s.stopsLabelIcon}>🎯</Text>
              <Text style={s.stopsSubLabel}>Delivery Locations</Text>
            </View>
            {dropoffStops.map((stop) => (
              <View key={`${stop.city_id}-${stop.stopOrder}`} style={s.stopChip}>
                <Text style={s.stopChipText}>
                  {stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Row 3: Services + Capacity */}
      {r.services.length > 0 && (
        <View style={s.servicesRow}>
          <View style={s.servicesTopRow}>
            <Text style={s.servicesLabel}>Driver Offered Services</Text>
            <View style={s.capacityHighlight}>
              <View style={s.capacityLabelRow}>
                <Package size={12} color={Colors.text.secondary} strokeWidth={2} />
                <Text style={s.capacityLabel}>{r.capacityLeft} / {r.totalWeight} kg</Text>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${Math.round((r.capacityLeft / r.totalWeight) * 100)}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>
          <View style={s.servicesList}>
            {r.services.map((svc, idx) => (
              <View key={idx} style={s.serviceBadge}>
                <Text style={s.serviceName}>{svc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Row 4: Prohibited items */}
      {r.prohibitedItems.length > 0 && (
        <View style={s.prohibitedRow}>
          <Text style={s.prohibitedLabel}>⚠️ Prohibited</Text>
          <Text style={s.prohibitedList}>{r.prohibitedItems.join(', ')}</Text>
        </View>
      )}

      {/* CTA */}
      {!r.isFull ? (
        <TouchableOpacity style={s.bookBtn} onPress={() => onBook(r.id)} activeOpacity={0.85}>
          <Text style={s.bookBtnText}>{t('home.bookSlot')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.fullBox}>
          <Text style={s.fullText}>{t('home.routeFull')}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
    gap: Spacing.md,
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  driverHighlight: { flex: 0.85, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.white },
  driverMeta: { flex: 1 },
  driverName: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.primary },
  trustSignal: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.text.secondary, marginTop: 2 },
  priceHighlight: { flex: 0.6, alignItems: 'flex-end', gap: 2 },
  priceDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  effectivePrice: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  promotionBadge: {
    marginTop: 4,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  promotionText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  countrySection: { flex: 1, gap: Spacing.md },
  countryHeader: { paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  labelWithCountry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  countrySectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  countryFlagSmall: { fontSize: 18 },
  countryNameSmall: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  stopsList: { gap: Spacing.sm },
  stopsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  stopsLabelIcon: { fontSize: 16 },
  stopsSubLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  stopChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  stopChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.primary },
  routeArrow: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.sm },
  capacityHighlight: { gap: 4 },
  capacityLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacityLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  progressTrack: {
    height: 6, width: 80,
    backgroundColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  servicesRow: { gap: Spacing.sm },
  servicesTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servicesLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary },
  servicesList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serviceBadge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  serviceName: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.primary },
  prohibitedRow: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  prohibitedLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.xs },
  prohibitedList: { fontSize: FontSize.xs, color: Colors.text.secondary },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  fullBox: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
});
