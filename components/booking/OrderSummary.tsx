import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';

export interface OrderSummaryProps {
  routeOriginCity: string;
  routeDestinationCity: string;
  pricePerKgEur: number;
  promotionActive?: boolean;
  promotionPercentage?: number | null;
  collectionStopCity: string;
  collectionStopDate?: string;
  dropoffStopCity: string;
  dropoffStopDate?: string;
  weightKg: number;
  collectionServiceLabel?: string;
  collectionServicePrice?: number;
  deliveryServiceLabel?: string;
  deliveryServicePrice?: number;
  totalPrice: number;
}

function Row({
  label, value, bold, green, muted,
}: {
  label: string; value: string; bold?: boolean; green?: boolean; muted?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, muted && s.muted]}>{label}</Text>
      <Text style={[s.rowValue, bold && s.bold, green && s.green, muted && s.muted]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

export function OrderSummary({
  routeOriginCity, routeDestinationCity,
  pricePerKgEur, promotionActive, promotionPercentage,
  collectionStopCity, collectionStopDate,
  dropoffStopCity, dropoffStopDate,
  weightKg,
  collectionServiceLabel, collectionServicePrice = 0,
  deliveryServiceLabel, deliveryServicePrice = 0,
  totalPrice,
}: OrderSummaryProps) {
  const effectiveRate = promotionActive && promotionPercentage
    ? pricePerKgEur * (1 - promotionPercentage / 100)
    : pricePerKgEur;

  const fmt = (n: number) => `€${n.toFixed(2)}`;

  const collectionLabel = collectionStopCity
    ? `${collectionStopCity}${collectionStopDate ? ` · ${formatDateShort(collectionStopDate)}` : ''}`
    : '—';
  const dropoffLabel = dropoffStopCity
    ? `${dropoffStopCity}${dropoffStopDate ? ` · ${formatDateShort(dropoffStopDate)}` : ''}`
    : '—';

  const rateLabel = promotionActive && promotionPercentage
    ? `${weightKg} kg × ${fmt(effectiveRate)}/kg (−${promotionPercentage}%)`
    : `${weightKg} kg × ${fmt(pricePerKgEur)}/kg`;

  return (
    <View style={s.card}>
      <Text style={s.title}>Shipment summary</Text>
      <Divider />

      <Row label="Route"         value={`${routeOriginCity} → ${routeDestinationCity}`} />
      <Row label="Collection"    value={collectionLabel} />
      <Row label="Drop-off"      value={dropoffLabel} />
      <Divider />

      {weightKg > 0 ? (
        <>
          <Row label={rateLabel} value={fmt(weightKg * effectiveRate)} />
          {collectionServicePrice > 0 && collectionServiceLabel ? (
            <Row label={collectionServiceLabel} value={`+${fmt(collectionServicePrice)}`} />
          ) : null}
          {deliveryServicePrice > 0 && deliveryServiceLabel ? (
            <Row label={deliveryServiceLabel} value={`+${fmt(deliveryServicePrice)}`} />
          ) : null}
          <Divider />
          <Row label="Platform fee"  value="Included · Free" green />
          <Divider />
          <Row label="Total"         value={fmt(totalPrice)} bold />
          <Divider />
        </>
      ) : (
        <>
          <Row label="Weight"  value="Enter weight →" muted />
          <Divider />
          <Row label="Total"   value="—"              muted />
          <Divider />
        </>
      )}

      <View style={s.escrowRow}>
        <Lock size={12} color={Colors.text.tertiary} strokeWidth={2} />
        <Text style={s.escrowText}>
          Escrow protection — Released only on delivery (coming soon)
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.base, margin: Spacing.base,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  title: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  rowLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, flex: 1, marginRight: Spacing.sm },
  rowValue: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600', textAlign: 'right' },
  bold:  { fontSize: FontSize.base, fontWeight: '800' },
  green: { color: Colors.success },
  muted: { color: Colors.text.tertiary, fontWeight: '400' },
  escrowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.xs },
  escrowText: { flex: 1, fontSize: 11, color: Colors.text.tertiary, lineHeight: 16 },
});
