import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { MonthlyRevenue } from '@/stores/driverBookingStore';

const BAR_MAX_HEIGHT = 80;

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <View style={styles.container} testID="revenue-chart">
      <Text style={styles.title}>Monthly Revenue</Text>
      <View style={styles.chart}>
        {data.map((item) => {
          const height = Math.max((item.revenue / maxRevenue) * BAR_MAX_HEIGHT, 4);
          const isEmpty = item.revenue === 0;
          return (
            <View key={item.month} style={styles.barCol}>
              {!isEmpty && (
                <Text style={styles.amount}>€{item.revenue.toFixed(0)}</Text>
              )}
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    isEmpty && styles.barEmpty,
                  ]}
                />
              </View>
              <Text style={styles.label}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  barWrap: {
    width: '100%',
    alignItems: 'center',
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  barEmpty: {
    backgroundColor: Colors.border.light,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
});
