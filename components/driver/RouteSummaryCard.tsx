import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface Stop {
  city: string;
  country: string;
}

export interface RouteSummaryCardProps {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  departureDate: string;
  estimatedArrivalDate: string;
  weightKg: string;
  pricePerKg: string;
  promoEnabled: boolean;
  promoDiscountPct: string;
  promoLabel: string;
  paymentMethods: string[];
  collectionStops: Stop[];
  dropoffStops: Stop[];
  prohibitedItems?: string[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash_sender:    'Cash on collection',
  cash_recipient: 'Cash on delivery',
  paypal:         'PayPal',
  bank_transfer:  'Bank transfer',
};

function Row({ label, value, bold, muted, green }: {
  label: string; value: string; bold?: boolean; muted?: boolean; green?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, muted && s.muted]}>{label}</Text>
      <Text style={[s.rowValue, bold && s.bold, muted && s.muted, green && s.green]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

export function RouteSummaryCard({
  originCity, originCountry, destinationCity, destinationCountry,
  departureDate, estimatedArrivalDate,
  weightKg, pricePerKg,
  promoEnabled, promoDiscountPct, promoLabel,
  paymentMethods,
  collectionStops, dropoffStops,
  prohibitedItems = [],
}: RouteSummaryCardProps) {
  const hasRoute = originCity || destinationCity;
  const price    = parseFloat(pricePerKg) || 0;
  const weight   = parseFloat(weightKg) || 0;
  const pct      = promoEnabled ? parseInt(promoDiscountPct) || 0 : 0;
  const discountedPrice    = pct > 0 ? price * (1 - pct / 100) : null;
  const effectivePrice     = discountedPrice ?? price;
  const baseGross          = weight > 0 && effectivePrice > 0 ? weight * effectivePrice : null;
  const estimatedGrossLow  = baseGross != null ? baseGross * 1.20 : null;
  const estimatedGrossHigh = baseGross != null ? baseGross * 1.40 : null;

  const filledCollStops = collectionStops.filter((s) => s.city);
  const filledDropStops = dropoffStops.filter((s) => s.city);

  return (
    <View style={s.card}>
      <Text style={s.title}>Route summary</Text>
      <Divider />

      {/* Route */}
      {hasRoute ? (
        <View style={s.routeBlock}>
          <View style={s.routeLine}>
            <MapPin size={14} color={Colors.text.tertiary} />
            <Text style={s.routeCity}>
              {originCity || '—'}
              <Text style={s.routeArrow}> → </Text>
              {destinationCity || '—'}
            </Text>
          </View>
          {(originCountry || destinationCountry) && (
            <Text style={s.routeCountries}>
              {originCountry || '—'} → {destinationCountry || '—'}
            </Text>
          )}
        </View>
      ) : (
        <Row label="Route" value="Not set yet" muted />
      )}

      <Divider />

      {/* Dates */}
      <Row
        label="Departure"
        value={departureDate ? format(new Date(departureDate), 'EEE, MMM d, yyyy') : '—'}
        muted={!departureDate}
      />
      <Row
        label="Est. arrival"
        value={estimatedArrivalDate ? format(new Date(estimatedArrivalDate), 'EEE, MMM d, yyyy') : 'Not set'}
        muted={!estimatedArrivalDate}
      />

      <Divider />

      {/* Stops */}
      <Row
        label="Collection stops"
        value={filledCollStops.length > 0 ? filledCollStops.map((s) => s.city).join(', ') : 'None'}
        muted={filledCollStops.length === 0}
      />
      <Row
        label="Drop-off stops"
        value={filledDropStops.length > 0 ? filledDropStops.map((s) => s.city).join(', ') : 'None'}
        muted={filledDropStops.length === 0}
      />

      <Divider />

      {/* Pricing */}
      <Row
        label="Capacity"
        value={weight > 0 ? `${weightKg} kg` : '—'}
        muted={weight === 0}
      />
      <Row
        label="Base price"
        value={price > 0 ? `€${pricePerKg}/kg` : '—'}
        muted={price === 0}
        bold={price > 0}
      />
      {discountedPrice != null && (
        <Row
          label={promoLabel || `${promoDiscountPct}% off`}
          value={`€${discountedPrice.toFixed(2)}/kg`}
          green
        />
      )}
      {baseGross != null && estimatedGrossLow != null && estimatedGrossHigh != null && (
        <>
          <Divider />
          <Text style={s.grossHeading}>Est. earnings (fully booked)</Text>
          <Row label="Transport" value={`€${baseGross.toFixed(0)}`} />
          <Row
            label="Services"
            value={`€${(estimatedGrossLow - baseGross).toFixed(0)}–€${(estimatedGrossHigh - baseGross).toFixed(0)}`}
            muted
          />
          <View style={s.grossTotalRow}>
            <Text style={s.grossTotalLabel}>Total</Text>
            <Text style={s.grossTotalValue}>€{estimatedGrossLow.toFixed(0)}–€{estimatedGrossHigh.toFixed(0)}</Text>
          </View>
        </>
      )}

      {/* Payment methods */}
      {paymentMethods.length > 0 && (
        <>
          <Divider />
          <Text style={s.subheading}>Payment</Text>
          {paymentMethods.map((m) => (
            <Text key={m} style={s.paymentItem}>· {PAYMENT_LABELS[m] ?? m}</Text>
          ))}
        </>
      )}

      {/* Prohibited items */}
      {prohibitedItems.length > 0 && (
        <>
          <Divider />
          <Text style={s.subheading}>Prohibited</Text>
          <View style={s.prohibitedWrap}>
            {prohibitedItems.map((item) => (
              <View key={item} style={s.prohibitedChip}>
                <Text style={s.prohibitedChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </>
      )}
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
  routeBlock: { gap: 3, marginBottom: 2 },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  routeCity: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  routeArrow: { fontWeight: '400', color: Colors.text.tertiary },
  routeCountries: { fontSize: FontSize.xs, color: Colors.text.secondary, marginLeft: 22 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: Spacing.sm,
  },
  rowLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, flex: 1 },
  rowValue: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600', textAlign: 'right', flex: 1 },
  bold:  { fontSize: FontSize.base, fontWeight: '800' },
  muted: { color: Colors.text.tertiary, fontWeight: '400' },
  green: { color: Colors.success },
  subheading: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentItem: { fontSize: FontSize.xs, color: Colors.text.secondary, paddingVertical: 2 },
  grossHeading: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  grossTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: 4,
    paddingTop: 6,
  },
  grossTotalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  grossTotalValue: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.success,
  },
  prohibitedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  prohibitedChip: {
    backgroundColor: Colors.errorLight ?? '#FEF2F2',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prohibitedChipText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: '600',
  },
});
