import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { CANCELLATION_REASON_LABELS, type CancellationReason } from '@/constants/bookingStatus';

interface CancellationBannerProps {
  reason: CancellationReason | null | undefined;
}

/** Bug fix: cancellation_reason is already used on DriverBookingCard (list
 *  view) but the detail screen never read it — a driver opening a cancelled
 *  booking's detail page saw only the bare "Cancelled" badge. */
export function CancellationBanner({ reason }: CancellationBannerProps) {
  if (!reason) return null;
  const label = CANCELLATION_REASON_LABELS[reason];
  if (!label) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  text: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },
});
