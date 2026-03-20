import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const PAYMENT_LABEL: Record<string, string> = {
  cash_on_collection: 'Cash on collection',
  cash_on_delivery:   'Cash on delivery',
  credit_debit_card:  'Credit / Debit card',
  paypal:             'PayPal',
};

const PAYMENT_DESC: Record<string, string> = {
  cash_on_collection: 'Pay the driver when handing over your package.',
  cash_on_delivery:   'Recipient pays the driver on delivery.',
  credit_debit_card:  'Secure card payment via Stripe.',
  paypal:             'Pay via PayPal.',
};

interface PaymentOptionProps {
  type: string;
  selected: boolean;
  comingSoon?: boolean;
  onPress: () => void;
}

export function PaymentOption({ type, selected, comingSoon, onPress }: PaymentOptionProps) {
  const label = PAYMENT_LABEL[type] ?? type;
  const desc  = PAYMENT_DESC[type] ?? '';
  const disabled = !!comingSoon;

  return (
    <TouchableOpacity
      style={[s.card, selected && s.cardActive, disabled && s.cardDisabled]}
      onPress={() => !disabled && onPress()}
      activeOpacity={disabled ? 1 : 0.75}
    >
      <View style={s.row}>
        <View style={[s.radio, selected && s.radioActive, disabled && s.radioDisabled]}>
          {selected && <View style={s.radioInner} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.topRow}>
            <Text style={[s.label, disabled && s.labelDisabled]}>{label}</Text>
            {comingSoon && (
              <View style={s.badge}>
                <Text style={s.badgeText}>Coming soon</Text>
              </View>
            )}
          </View>
          {desc ? <Text style={[s.desc, disabled && s.descDisabled]}>{desc}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  cardActive:   { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cardDisabled: { opacity: 0.5 },
  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  radioActive:   { borderColor: Colors.primary },
  radioDisabled: { borderColor: Colors.border.light },
  radioInner:    { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label:         { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  labelDisabled: { color: Colors.text.tertiary },
  desc:          { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  descDisabled:  { color: Colors.text.tertiary },
  badge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },
});
