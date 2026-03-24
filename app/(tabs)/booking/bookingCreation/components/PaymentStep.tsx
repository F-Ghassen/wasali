import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PaymentOption } from '@/components/ui/PaymentOption';
import type { FetchedPaymentMethod } from '@/hooks/useRouteData';

// ─── All possible payment types (defines display order) ──────────────────────

const ALL_PAYMENT_TYPES = [
  'cash_on_collection',
  'cash_on_delivery',
  'credit_debit_card',
  'paypal',
] as const;

// Platform-level gate: these types are not yet live regardless of driver config
const PLATFORM_COMING_SOON = new Set(['credit_debit_card', 'paypal']);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentStepProps {
  paymentMethods: FetchedPaymentMethod[];
  selectedType: string;
  isSubmitting: boolean;
  onSelectType: (type: typeof ALL_PAYMENT_TYPES[number]) => void;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentStep({
  paymentMethods, selectedType, isSubmitting, onSelectType, onSubmit,
}: PaymentStepProps) {
  const { t } = useTranslation();

  // Build enabled map from DB; fallback: both cash options enabled
  const enabledMap: Record<string, boolean> = paymentMethods.length > 0
    ? Object.fromEntries(paymentMethods.map((m) => [m.payment_type, m.enabled]))
    : { cash_on_collection: true, cash_on_delivery: true };

  return (
    <View>
      {ALL_PAYMENT_TYPES.map((type) => {
        const driverEnabled = enabledMap[type] ?? false;
        const comingSoon = PLATFORM_COMING_SOON.has(type) || !driverEnabled;
        return (
          <PaymentOption
            key={type}
            type={type}
            selected={selectedType === type}
            comingSoon={comingSoon}
            onPress={() => onSelectType(type)}
          />
        );
      })}

      {/* Escrow info */}
      <View style={s.escrowRow}>
        <Lock size={13} color={Colors.text.secondary} strokeWidth={2} />
        <Text style={s.escrowText}>{t('booking.escrow')}</Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
        activeOpacity={0.85}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? <ActivityIndicator size="small" color={Colors.white} />
          : <Text style={s.submitBtnText}>{t('booking.confirmPay')}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  escrowRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs,
    marginTop: Spacing.base, marginBottom: Spacing.base,
  },
  escrowText: { flex: 1, fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
