import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { formatDate } from '@/utils/formatters';
import { resolvePaymentMethods } from '@/constants/paymentMethods';

interface PaymentTrackingCardProps {
  paymentType: string | null;
  isPaymentPending: boolean;
  paidAt?: string | null;
  routePaymentMethods: { payment_type: string; enabled: boolean }[];
  isLoading: boolean;
  onMarkPaid: () => void;
}

export function PaymentTrackingCard({
  paymentType, isPaymentPending, paidAt, routePaymentMethods, isLoading, onMarkPaid,
}: PaymentTrackingCardProps) {
  const { t } = useTranslation();
  const resolved = resolvePaymentMethods(routePaymentMethods);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.payment')}</Text>

      {isPaymentPending ? (
        <>
          <Text style={styles.paymentHint}>
            {paymentType === 'cash_on_collection'
              ? t('bookingDetail.paymentHints.collectFromSender')
              : t('bookingDetail.paymentHints.collectFromRecipient')}
          </Text>
          <Button
            label={t('bookingDetail.actions.markAsPaid')}
            variant="outline"
            size="md"
            isLoading={isLoading}
            onPress={onMarkPaid}
          />
        </>
      ) : (
        <View style={styles.paidRow}>
          <CheckCircle2 size={18} color={Colors.success} strokeWidth={2} />
          <Text style={styles.paidText}>
            {t('bookingDetail.paidLabel')}
            {paidAt ? ` · ${formatDate(paidAt)}` : ''}
          </Text>
        </View>
      )}

      {/* Accepted payment methods reference row — per-route dynamic, derived
          from route_payment_methods (falls back to "both cash enabled" when
          unconfigured). Not a picker — the booking's payment_type above is
          already locked in and can't be changed after booking. */}
      <View style={styles.acceptedSection}>
        <Text style={styles.acceptedTitle}>{t('bookingDetail.sections.acceptedPayments')}</Text>
        <View style={styles.acceptedList}>
          {resolved.map((m) => (
            <View key={m.type} style={[styles.acceptedChip, !m.selectable && styles.acceptedChipDisabled]}>
              <Text style={[styles.acceptedChipText, !m.selectable && styles.acceptedChipTextDisabled]}>
                {t(m.labelKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentHint: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.sm },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  paidText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.success },
  acceptedSection: { marginTop: Spacing.sm, gap: Spacing.xs },
  acceptedTitle: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  acceptedList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  acceptedChip: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  acceptedChipDisabled: { backgroundColor: Colors.background.tertiary },
  acceptedChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.success },
  acceptedChipTextDisabled: { color: Colors.text.tertiary },
});
