import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PaymentOption } from '@/components/booking/PaymentOption';
import { resolvePaymentMethods, type PaymentType } from '@/constants/paymentMethods';
import type { FetchedPaymentMethod } from '@/hooks/useRouteData';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentStepProps {
  paymentMethods: FetchedPaymentMethod[];
  selectedType: string;
  isSubmitting: boolean;
  onSelectType: (type: PaymentType) => void;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentStep({
  paymentMethods, selectedType, isSubmitting, onSelectType, onSubmit,
}: PaymentStepProps) {
  const { t } = useTranslation();

  // Canonical catalogue (constants/paymentMethods.ts) crossed against this
  // route's driver-enabled flags — falls back to "both cash enabled" when
  // the route has no route_payment_methods rows configured.
  const resolved = resolvePaymentMethods(paymentMethods);

  return (
    <View>
      {resolved.map(({ type, selectable }) => (
        <PaymentOption
          key={type}
          type={type}
          selected={selectedType === type}
          comingSoon={!selectable}
          onPress={() => onSelectType(type)}
        />
      ))}

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
