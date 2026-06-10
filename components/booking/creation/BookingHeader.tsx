import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';

interface BookingHeaderProps {
  currentStep: number;
  routeData: any;
  onBack: () => void;
}

export function BookingHeader({ routeData, onBack }: BookingHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Book shipment</Text>
        {routeData && (
          <Text style={styles.headerRoute}>
            {routeData.driver?.full_name} · Origin → Destination ·{' '}
            {formatDateShort(routeData.departure_date)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  headerRoute: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
