import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface LogisticsInfoCardProps {
  pickupType: string;
  dropoffType: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  /** The note the SENDER wrote for the DRIVER at booking time (booking.driver_notes).
   *  Bug fix: was previously mislabeled "Sender notes" on the driver screen. */
  noteFromSender?: string | null;
}

export function LogisticsInfoCard({
  pickupType, dropoffType, pickupAddress, dropoffAddress, noteFromSender,
}: LogisticsInfoCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.logistics')}</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.pickup')}</Text>
          <Text style={styles.gridValue}>
            {pickupType === 'driver_pickup' ? t('bookingDetail.logisticsValues.driverCollects') : t('bookingDetail.logisticsValues.senderDropsOff')}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.delivery')}</Text>
          <Text style={styles.gridValue}>
            {dropoffType === 'home_delivery' ? t('bookingDetail.logisticsValues.homeDelivery') : t('bookingDetail.logisticsValues.recipientPickup')}
          </Text>
        </View>
      </View>
      {pickupAddress && (
        <View style={styles.notesRow}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.pickupAddress')}</Text>
          <Text style={styles.notesText}>{pickupAddress}</Text>
        </View>
      )}
      {dropoffAddress && (
        <View style={styles.notesRow}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.deliveryAddress')}</Text>
          <Text style={styles.notesText}>{dropoffAddress}</Text>
        </View>
      )}
      {noteFromSender && (
        <View style={styles.notesRow}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.noteFromSender')}</Text>
          <Text style={styles.notesText}>{noteFromSender}</Text>
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
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { minWidth: '45%' },
  gridLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  gridValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  notesRow: { gap: 4 },
  notesText: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
