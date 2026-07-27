import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatPrice } from '@/utils/formatters';

interface PayoutCardProps {
  /** What the sender paid in total (includes the platform's service fee). */
  senderPaidEur: number;
  /** What the driver actually keeps (senderPaid − platform commission). */
  driverPayoutEur: number;
}

export function PayoutCard({ senderPaidEur, driverPayoutEur }: PayoutCardProps) {
  const { t } = useTranslation();
  const hasCommission = driverPayoutEur !== senderPaidEur;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.payout')}</Text>
      <View style={styles.row}>
        <Text style={styles.payoutLabel}>{t('bookingDetail.labels.payout')}</Text>
        <Text style={styles.payoutValue}>{formatPrice(driverPayoutEur)}</Text>
      </View>
      {hasCommission && (
        <View style={styles.row}>
          <Text style={styles.senderPaidLabel}>{t('bookingDetail.labels.senderPaid')}</Text>
          <Text style={styles.senderPaidValue}>{formatPrice(senderPaidEur)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  payoutLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  payoutValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.success },
  senderPaidLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  senderPaidValue: { fontSize: FontSize.xs, color: Colors.text.tertiary },
});
