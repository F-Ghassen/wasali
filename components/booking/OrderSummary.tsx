import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import type { RouteWithStops } from '@/types/models';

export interface OrderSummaryProps {
  route: (RouteWithStops & { price_per_kg_eur: number }) | null;
  collectionCity: string;
  dropoffCity: string;
  collectionCityDate?: string;
  dropoffCityDate?: string;
  weightKg: number;
  collectionMethod: 'dropoff' | 'pickup';
  deliveryMethod: 'collect' | 'home' | 'post';
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
  route, collectionCity, dropoffCity, collectionCityDate, dropoffCityDate,
  weightKg, collectionMethod, deliveryMethod,
}: OrderSummaryProps) {
  if (!route) return null;

  const pricePerKg       = route.price_per_kg_eur;
  const basePrice        = weightKg * pricePerKg;
  const pickupSurcharge  = collectionMethod === 'pickup' ? 8 : 0;
  const deliverySurcharge =
    deliveryMethod === 'home' ? 10 : deliveryMethod === 'post' ? 6 : 0;
  const total = basePrice + pickupSurcharge + deliverySurcharge;

  const fmt = (n: number) => `€${n.toFixed(2)}`;

  const collectionLabel = collectionCity
    ? `${collectionCity}${collectionCityDate ? ` · ${formatDateShort(collectionCityDate)}` : ''}`
    : '—';
  const dropoffLabel = dropoffCity
    ? `${dropoffCity}${dropoffCityDate ? ` · ${formatDateShort(dropoffCityDate)}` : ''}`
    : '—';

  return (
    <View style={s.card}>
      <Text style={s.title}>Shipment summary</Text>
      <Divider />

      <Row label="Route"        value={`${route.origin_city} → ${route.destination_city}`} />
      <Row label="Collection"   value={collectionLabel} />
      <Row label="Est. delivery" value={dropoffLabel} />
      <Divider />

      {weightKg > 0 ? (
        <>
          <Row label={`${weightKg} kg × ${fmt(pricePerKg)}/kg`} value={fmt(basePrice)} />
          {pickupSurcharge > 0 && (
            <Row label="Driver pick-up"    value={`+${fmt(pickupSurcharge)}`} />
          )}
          {deliverySurcharge > 0 && (
            <Row
              label={deliveryMethod === 'home' ? 'Home delivery' : 'Post delivery'}
              value={`+${fmt(deliverySurcharge)}`}
            />
          )}
          <Divider />
          <Row label="Subtotal"       value={fmt(total)} />
          <Row label="Platform fee"   value="✓ Free"   green />
          <Divider />
          <Row label="Total"          value={fmt(total)} bold />
          <Divider />
        </>
      ) : (
        <>
          <Row label="Weight"  value="Enter weight" muted />
          <Divider />
          <Row label="Total"   value="—"            muted />
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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    margin: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  rowLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, flex: 1, marginRight: Spacing.sm },
  rowValue: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600', textAlign: 'right' },
  bold:  { fontSize: FontSize.base, fontWeight: '800' },
  green: { color: Colors.success },
  muted: { color: Colors.text.tertiary, fontWeight: '400' },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  escrowText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
});
