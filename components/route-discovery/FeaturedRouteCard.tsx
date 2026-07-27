import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { ArrowRight, Package, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { FeaturedRoute } from '@/app/route-discovery/types/featured-route';

const SERVICE_LABEL: Record<string, string> = {
  sender_dropoff: 'Drop-off point',
  driver_pickup: 'Home pickup',
  recipient_collects: 'Self-collect',
  driver_delivery: 'Door delivery',
  local_post: 'Local post',
};

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
  const capacityPct  = Math.round((r.capacityLeft / r.totalWeight) * 100);
  const isLowStock   = capacityPct <= 20;

  return (
    <View style={s.card}>
      <View style={s.featuredStrip} />
      <View style={s.content}>
        {/* Row 1: Driver + Price */}
        <View style={s.row1}>
        <View style={s.driverHighlight}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{r.driverName[0]}</Text>
          </View>
          <View style={s.driverMeta}>
            <Text style={s.driverName} numberOfLines={1}>{r.driverName}</Text>
            {r.driverRating !== null && r.driverRating > 0 ? (
              <View style={s.trustSignalRow}>
                <Star size={11} color={Colors.gold} fill={Colors.gold} strokeWidth={0} />
                <Text style={s.trustSignal}>{r.driverRating.toFixed(1)} · {r.driverTrips} trips</Text>
              </View>
            ) : (
              <View style={s.newDriverBadge}>
                <Text style={s.newDriverText}>New driver</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.priceHighlight}>
          {promotionLabel && (
            <View style={s.promotionBadge}>
              <Text style={s.promotionText}>{promotionLabel}</Text>
            </View>
          )}
          <View style={s.priceDisplay}>
            <Text style={s.effectivePrice}>€{effectivePrice}</Text>
            <Text style={s.priceUnit}>/kg</Text>
          </View>
        </View>
      </View>

      {/* Row 2: Route stops */}
      <View style={s.routeSummary}>
        <View style={s.countryHeaderRow}>
          <View style={s.labelWithCountry}>
            <Text style={s.countryFlagSmall}>{r.fromFlag}</Text>
            <Text style={s.countryNameSmall}>{r.fromCountry}</Text>
          </View>
          <ArrowRight size={16} color={Colors.text.tertiary} strokeWidth={2.5} />
          <View style={s.labelWithCountry}>
            <Text style={s.countryFlagSmall}>{r.toFlag}</Text>
            <Text style={s.countryNameSmall}>{r.toCountry}</Text>
          </View>
        </View>

        <View style={s.stopsColumns}>
          <View style={s.countrySection}>
            <View style={s.stopsLabelRow}>
              <Text style={s.stopsLabelIcon}>📍</Text>
              <Text style={s.stopsSubLabel}>Pickup</Text>
            </View>
            <View style={s.stopsList}>
              {pickupStops.map((stop) => (
                <View key={`${stop.city_id}-${stop.stopOrder}`} style={s.stopChip}>
                  <Text style={s.stopChipText} numberOfLines={1}>
                    {stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.stopsDivider} />

          <View style={s.countrySection}>
            <View style={s.stopsLabelRow}>
              <Text style={s.stopsLabelIcon}>🎯</Text>
              <Text style={s.stopsSubLabel}>Delivery</Text>
            </View>
            <View style={s.stopsList}>
              {dropoffStops.map((stop) => (
                <View key={`${stop.city_id}-${stop.stopOrder}`} style={s.stopChip}>
                  <Text style={s.stopChipText} numberOfLines={1}>
                    {stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Row 3: Capacity */}
      <View style={s.capacityRow}>
        <View style={s.capacityLabelRow}>
          <Package size={13} color={isLowStock ? Colors.error : Colors.text.secondary} strokeWidth={2} />
          <Text style={[s.capacityLabel, isLowStock && s.capacityLabelLow]}>
            {r.capacityLeft} / {r.totalWeight} kg available
          </Text>
        </View>
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              isLowStock && s.progressFillLow,
              { width: `${capacityPct}%` as any },
            ]}
          />
        </View>
      </View>

      {/* Row 4: Services */}
      {r.services.length > 0 && (
        <View style={s.servicesRow}>
          <Text style={s.servicesLabel}>Driver Offered Services</Text>
          <View style={s.servicesList}>
            {r.services.map((svc, idx) => (
              <View key={idx} style={s.serviceBadge}>
                <Text style={s.serviceName}>{SERVICE_LABEL[svc] ?? svc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      </View>

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
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  featuredStrip: {
    height: 3,
    backgroundColor: Colors.gold,
  },
  content: {
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  driverHighlight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.white },
  driverMeta: { flex: 1, gap: 2 },
  driverName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  trustSignalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustSignal: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  newDriverBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newDriverText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.secondary },
  priceHighlight: { alignItems: 'flex-end', gap: 2 },
  priceDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  effectivePrice: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  promotionBadge: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  promotionText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
  routeSummary: {
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  countryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  labelWithCountry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  countryFlagSmall: { fontSize: 16 },
  countryNameSmall: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  stopsColumns: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  stopsDivider: { width: 1, backgroundColor: Colors.border.light },
  countrySection: { flex: 1, gap: Spacing.sm },
  stopsList: { gap: Spacing.xs },
  stopsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  stopsLabelIcon: { fontSize: 12 },
  stopsSubLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  stopChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  stopChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.primary },
  capacityRow: { gap: 6 },
  capacityLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacityLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  capacityLabelLow: { color: Colors.error, fontWeight: '700' },
  progressTrack: {
    height: 6, width: '100%',
    backgroundColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: BorderRadius.full },
  progressFillLow: { backgroundColor: Colors.error },
  servicesRow: { gap: Spacing.sm },
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
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
});
