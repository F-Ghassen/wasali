import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import type { BookingStatus } from '@/constants/bookingStatus';

interface BookingActionsCardProps {
  status: BookingStatus;
  isLoading: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onScanQr: () => void;
  /** Opens the weight-confirmation modal (which itself calls markInTransit). */
  onMarkInTransit: () => void;
  onMarkDelivered: () => void;
}

export function BookingActionsCard({
  status, isLoading, onConfirm, onReject, onScanQr, onMarkInTransit, onMarkDelivered,
}: BookingActionsCardProps) {
  const { t } = useTranslation();

  if (status === 'pending') {
    return (
      <View style={styles.actionsCard}>
        <Button label={t('bookingDetail.actions.confirm')} onPress={onConfirm} isLoading={isLoading} size="lg" />
        <Button label={t('bookingDetail.actions.reject')} onPress={onReject} variant="destructive" size="md" />
      </View>
    );
  }

  if (status === 'confirmed') {
    return (
      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.scanBtn} onPress={onScanQr} disabled={isLoading}>
          <ScanLine size={18} color={Colors.white} />
          <Text style={styles.scanBtnText}>{t('bookingDetail.actions.scanQR')}</Text>
        </TouchableOpacity>
        <Button
          label={t('bookingDetail.actions.markInTransit')}
          onPress={onMarkInTransit}
          isLoading={isLoading}
          size="lg"
          variant="outline"
        />
      </View>
    );
  }

  if (status === 'in_transit') {
    return (
      <View style={styles.actionsCard}>
        <Button label={t('bookingDetail.actions.markDelivered')} onPress={onMarkDelivered} isLoading={isLoading} size="lg" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  actionsCard: { gap: Spacing.sm },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  scanBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
