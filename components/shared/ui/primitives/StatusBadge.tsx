import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOOKING_STATUS_CONFIG, type BookingStatus } from '@/constants/bookingStatus';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface StatusBadgeProps {
  status: BookingStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = BOOKING_STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      {showIcon && <Text style={styles.icon}>{config.icon}</Text>}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  icon: { fontSize: 12 },
  label: { fontSize: FontSize.xs, fontWeight: '600' },
});
