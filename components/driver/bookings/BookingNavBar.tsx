import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { BookingStatus } from '@/constants/bookingStatus';
import { StatusBadge } from '@/components/shared/ui/primitives/StatusBadge';

interface BookingNavBarProps {
  title: string;
  reference?: string;
  status?: BookingStatus;
  onBack: () => void;
}

export function BookingNavBar({ title, reference, status, onBack }: BookingNavBarProps) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ArrowLeft size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.navCenter}>
        <Text style={styles.navTitle}>{title}</Text>
        {reference && <Text style={styles.navRef}>#{reference}</Text>}
      </View>
      {status ? <StatusBadge status={status} showIcon={false} /> : <View style={{ width: 40 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navCenter: { alignItems: 'center' },
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  navRef: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
});
