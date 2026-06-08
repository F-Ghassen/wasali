import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface EarningsSummaryProps {
  totalEarnings: number;
  deliveredCount: number;
}

export function EarningsSummary({ totalEarnings, deliveredCount }: EarningsSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Total Earnings</Text>
          <Text style={styles.amount}>€{totalEarnings.toFixed(2)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{deliveredCount} delivered</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  amount: {
    fontSize: FontSize['3xl'],
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badgeText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '600',
  },
});
