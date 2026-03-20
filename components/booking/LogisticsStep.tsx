import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { ServiceOption } from '@/components/ui/ServiceOption';
import type { FetchedStop, FetchedService } from '@/hooks/useRouteData';

// ─── Types (re-exported for callers that import from here) ───────────────────

export type { FetchedService as RouteService };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LogisticsStepProps {
  collectionStop: FetchedStop;
  dropoffStop: FetchedStop;
  collectionServices: FetchedService[];
  deliveryServices: FetchedService[];
  selectedCollectionServiceId: string | null;
  selectedDeliveryServiceId: string | null;
  isValid: boolean;
  onSelectCollection: (id: string) => void;
  onSelectDelivery: (id: string) => void;
  onContinue: () => void;
}

// ─── StopContext ─────────────────────────────────────────────────────────────

function StopContext({ label, stop }: { label: string; stop: FetchedStop }) {
  return (
    <View style={s.stopCtx}>
      <View style={s.stopCtxHeader}>
        <MapPin size={12} color={Colors.text.secondary} strokeWidth={2.5} />
        <Text style={s.stopCtxLabel}>{label}</Text>
      </View>
      <Text style={s.stopCtxCity}>{stop.city}</Text>
      {stop.arrival_date ? (
        <Text style={s.stopCtxDate}>{formatDateShort(stop.arrival_date)}</Text>
      ) : null}
      {stop.location_name ? (
        <Text style={s.stopCtxLocation}>{stop.location_name}</Text>
      ) : null}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogisticsStep({
  collectionStop, dropoffStop,
  collectionServices, deliveryServices,
  selectedCollectionServiceId, selectedDeliveryServiceId,
  isValid, onSelectCollection, onSelectDelivery, onContinue,
}: LogisticsStepProps) {

  const singleCollection = collectionServices.length === 1;
  const singleDelivery   = deliveryServices.length === 1;

  return (
    <View>
      {/* ── Context: selected stops ────────────────────────────────── */}
      <View style={s.stopsRow}>
        <StopContext label="Collection" stop={collectionStop} />
        <Text style={s.arrow}>→</Text>
        <StopContext label="Drop-off" stop={dropoffStop} />
      </View>

      {/* ── Collection method ─────────────────────────────────────── */}
      <Text style={s.sectionTitle}>Collection method</Text>
      {collectionServices.length === 0 ? (
        <Text style={s.empty}>No collection options for this stop.</Text>
      ) : (
        collectionServices.map((svc) => (
          <ServiceOption
            key={svc.id}
            serviceType={svc.service_type}
            price={svc.price_eur}
            locationName={svc.service_type === 'sender_dropoff' ? collectionStop.location_name : svc.location_name}
            locationAddress={svc.service_type === 'sender_dropoff' ? collectionStop.meeting_point_url : svc.location_address}
            instructions={svc.instructions}
            selected={selectedCollectionServiceId === svc.id}
            readOnly={singleCollection}
            onPress={() => onSelectCollection(svc.id)}
          />
        ))
      )}

      {/* ── Delivery method ───────────────────────────────────────── */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.base }]}>Delivery method</Text>
      {deliveryServices.length === 0 ? (
        <Text style={s.empty}>No delivery options available.</Text>
      ) : (
        deliveryServices.map((svc) => (
          <ServiceOption
            key={svc.id}
            serviceType={svc.service_type}
            price={svc.price_eur}
            locationName={svc.service_type === 'recipient_collects' ? dropoffStop.location_name : svc.location_name}
            locationAddress={svc.service_type === 'recipient_collects' ? dropoffStop.meeting_point_url : svc.location_address}
            instructions={svc.instructions}
            selected={selectedDeliveryServiceId === svc.id}
            readOnly={singleDelivery}
            onPress={() => onSelectDelivery(svc.id)}
          />
        ))
      )}


      {/* ── Continue ──────────────────────────────────────────────── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  stopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  arrow: { fontSize: FontSize.base, color: Colors.text.tertiary },
  stopCtx: { flex: 1 },
  stopCtxHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopCtxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopCtxCity:     { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  stopCtxDate:     { fontSize: 10, color: Colors.text.secondary },
  stopCtxLocation: { fontSize: 10, color: Colors.text.tertiary, marginTop: 1 },

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
