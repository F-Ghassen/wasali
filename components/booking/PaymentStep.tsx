import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { Tables } from '@/types/database';

type RoutePaymentMethod = Tables<'route_payment_methods'>;

// ─── Payment options ──────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: {
  key: 'cash_on_collection' | 'cash_on_delivery' | 'credit_debit_card' | 'paypal';
  label: string;
  comingSoon?: boolean;
}[] = [
  { key: 'cash_on_collection', label: '💵  Cash on collection' },
  { key: 'cash_on_delivery',   label: '💵  Cash on delivery' },
  { key: 'credit_debit_card',  label: '💳  Card',    comingSoon: true },
  { key: 'paypal',             label: '🅿️  PayPal', comingSoon: true },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentStepProps {
  routePaymentMethods: RoutePaymentMethod[];
  selectedType: string;
  isSubmitting: boolean;
  onSelectType: (type: 'cash_on_collection' | 'cash_on_delivery' | 'credit_debit_card' | 'paypal') => void;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentStep({
  routePaymentMethods, selectedType, isSubmitting, onSelectType, onSubmit,
}: PaymentStepProps) {
  const { t } = useTranslation();

  return (
    <View>
      {PAYMENT_OPTIONS.map((opt) => {
        const isSelected = selectedType === opt.key;
        const isComing   = !!opt.comingSoon;

        return (
          <TouchableOpacity
            key={opt.key}
            style={[s.option, isSelected && s.optionActive, isComing && s.optionDisabled]}
            onPress={() => !isComing && onSelectType(opt.key)}
            activeOpacity={isComing ? 1 : 0.75}
          >
            <View style={s.optionRow}>
              <View style={[s.radio, isSelected && s.radioActive]}>
                {isSelected && <View style={s.radioInner} />}
              </View>
              <Text style={[s.optionLabel, isComing && s.optionLabelMuted]}>{opt.label}</Text>
              {isComing && (
                <View style={s.comingSoonBadge}>
                  <Text style={s.comingSoonText}>Coming soon</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
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
  option: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionDisabled: { opacity: 0.55, backgroundColor: Colors.background.secondary },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  optionLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  optionLabelMuted: { color: Colors.text.tertiary },
  comingSoonBadge: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  comingSoonText: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },

  escrowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
  },
  escrowText: { flex: 1, fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
