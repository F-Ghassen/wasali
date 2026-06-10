import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RouteCapacitySectionProps {
  available: number;
  total: number;
  minBooking?: number;
  maxSinglePackage?: number;
}

export function RouteCapacitySection({
  available,
  total,
  minBooking,
  maxSinglePackage,
}: RouteCapacitySectionProps) {
  const filled = total - available;
  const fillPct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  const isFull = available <= 0;
  const isAlmostFull = fillPct >= 80;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.label}>
          <Package size={16} color={Colors.text.secondary} strokeWidth={2} />
          <Text style={s.title}>Capacity</Text>
        </View>
        <Text style={s.value}>
          {available}
          <Text style={s.max}> / {total} kg</Text>
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${Math.max(fillPct, 3)}%` as any }]} />
      </View>

      {/* Status */}
      <Text style={s.status}>
        {isFull ? '❌ Full' : `${Math.round(fillPct)}% filled`}
      </Text>

      {/* Constraints */}
      {(minBooking || maxSinglePackage) && (
        <View style={s.constraintsSection}>
          <Text style={s.constraintsTitle}>Booking Limits</Text>
          <View style={s.constraintRow}>
            {minBooking && (
              <View style={s.constraint}>
                <Text style={s.constraintLabel}>Minimum</Text>
                <Text style={s.constraintValue}>{minBooking} kg</Text>
              </View>
            )}
            {maxSinglePackage && (
              <View style={s.constraint}>
                <Text style={s.constraintLabel}>Max per Package</Text>
                <Text style={s.constraintValue}>{maxSinglePackage} kg</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Warning */}
      {isAlmostFull && !isFull && (
        <View style={s.warning}>
          <AlertTriangle size={14} color={Colors.error} strokeWidth={2} />
          <Text style={s.warningText}>
            This route is {Math.round(fillPct)}% full — book soon
          </Text>
        </View>
      )}

      {isFull && (
        <View style={s.warning}>
          <AlertTriangle size={14} color={Colors.error} strokeWidth={2} />
          <Text style={s.warningText}>This route is full</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  value: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  max: {
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  barBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  status: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  constraintsSection: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.sm,
  },

  constraintsTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
  },

  constraintRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  constraint: {
    flex: 1,
  },

  constraintLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },

  constraintValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '600',
  },
});
