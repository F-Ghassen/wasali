import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
}

export function StatCard({ icon, label, value, accent = Colors.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  icon: { fontSize: 24 },
  value: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
