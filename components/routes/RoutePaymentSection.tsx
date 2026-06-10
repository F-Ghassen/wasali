import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RoutePaymentSectionProps {
  methods: string[];
}

const paymentMethodIcons: Record<string, string> = {
  credit_card: '💳',
  debit_card: '💳',
  bank_transfer: '🏦',
  mobile_money: '📱',
  paypal: 'P',
  stripe: 'S',
  apple_pay: '🍎',
  google_pay: 'G',
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  paypal: 'PayPal',
  stripe: 'Stripe',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

export function RoutePaymentSection({ methods }: RoutePaymentSectionProps) {
  if (!methods || methods.length === 0) {
    return null;
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <CreditCard size={16} color={Colors.text.secondary} strokeWidth={2} />
        <Text style={s.title}>Accepted Payment Methods</Text>
      </View>

      <View style={s.methods}>
        {methods.map((method) => (
          <View key={method} style={s.methodBadge}>
            <Text style={s.methodIcon}>
              {paymentMethodIcons[method] || '💰'}
            </Text>
            <Text style={s.methodLabel}>
              {paymentMethodLabels[method] || method}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  methodIcon: {
    fontSize: 16,
  },

  methodLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});
