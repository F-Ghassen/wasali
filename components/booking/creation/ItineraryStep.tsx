import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useCitiesStore } from '@/stores/citiesStore';
import type { FetchedStop } from '@/hooks/useRouteData';

interface ItineraryStepProps {
  collectionStops: FetchedStop[];
  dropoffStops: FetchedStop[];
  selectedCollectionStopId: string | null;
  selectedDropoffStopId: string | null;
  onSelectCollection: (stop: FetchedStop) => void;
  onSelectDropoff: (stop: FetchedStop) => void;
  isValid: boolean;
  onContinue: () => void;
}

function StopCard({
  stop, selected, onPress,
}: {
  stop: FetchedStop; selected: boolean; onPress: () => void;
}) {
  const cities = useCitiesStore((s) => s.cities);
  const cityName = useMemo(() => {
    return cities.find((c) => c.id === stop.city_id)?.name || stop.city_id || 'Unknown';
  }, [stop.city_id, cities]);

  return (
    <TouchableOpacity
      style={[s.stopCard, selected && s.stopCardActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.stopRow}>
        <View style={[s.radio, selected && s.radioActive]}>
          {selected && <View style={s.radioInner} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.cityRow}>
            <MapPin size={13} color={selected ? Colors.primary : Colors.text.tertiary} strokeWidth={2.5} />
            <Text style={[s.city, selected && s.cityActive]}>{cityName}</Text>
            {stop.arrival_date ? (
              <Text style={[s.date, selected && s.dateActive]}>
                {formatDateShort(stop.arrival_date)}
              </Text>
            ) : null}
          </View>
          {stop.location_name ? (
            <Text style={s.location} numberOfLines={1}>
              {stop.location_name}
            </Text>
          ) : null}
          {stop.location_address ? (
            <Text style={s.address} numberOfLines={1}>
              {stop.location_address}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ItineraryStep({
  collectionStops, dropoffStops,
  selectedCollectionStopId, selectedDropoffStopId,
  onSelectCollection, onSelectDropoff,
  isValid, onContinue,
}: ItineraryStepProps) {
  return (
    <View>
      {/* ── Collection stop ───────────────────────────────────── */}
      <Text style={s.sectionTitle}>Where will you hand over the package?</Text>
      {collectionStops.length === 0 ? (
        <Text style={s.empty}>No collection stops configured.</Text>
      ) : (
        collectionStops.map((stop) => (
          <StopCard
            key={stop.id}
            stop={stop}
            selected={selectedCollectionStopId === stop.id}
            onPress={() => onSelectCollection(stop)}
          />
        ))
      )}

      {/* ── Drop-off stop ─────────────────────────────────────── */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.base }]}>
        Where will the recipient collect / receive it?
      </Text>
      {dropoffStops.length === 0 ? (
        <Text style={s.empty}>No drop-off stops configured.</Text>
      ) : (
        dropoffStops.map((stop) => (
          <StopCard
            key={stop.id}
            stop={stop}
            selected={selectedDropoffStopId === stop.id}
            onPress={() => onSelectDropoff(stop)}
          />
        ))
      )}

      {/* ── Continue ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={[s.continueBtn, !isValid && s.continueBtnDisabled]}
        onPress={() => isValid && onContinue()}
        activeOpacity={0.85}
        disabled={!isValid}
      >
        <Text style={s.continueBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  stopCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  stopRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: { borderColor: Colors.primary },
  radioInner:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  cityRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  city:     { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  cityActive: { color: Colors.primary },
  date:     { fontSize: FontSize.xs, color: Colors.text.secondary, marginLeft: 'auto' as any },
  dateActive: { color: Colors.primary },
  location: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 4 },
  address:  { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  continueBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
