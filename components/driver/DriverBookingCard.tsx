import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BookingWithSender } from '@/types/models';
import type { BookingStatus } from '@/constants/bookingStatus';

interface DriverBookingCardProps {
  booking: BookingWithSender;
  onPress?: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
}

export function DriverBookingCard({ booking, onPress, onConfirm, onReject }: DriverBookingCardProps) {
  const sender = booking.sender as { full_name?: string; phone?: string } | undefined;
  const isPending = booking.status === 'pending';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>{sender?.full_name ?? 'Sender'}</Text>
          <Text style={styles.packageMeta}>
            {booking.package_weight_kg}kg · {booking.package_category}
          </Text>
        </View>
        <StatusBadge status={booking.status as BookingStatus} showIcon={false} />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pickup</Text>
          <Text style={styles.detailValue}>
            {booking.pickup_type === 'driver_pickup' ? '🚗 Driver collects' : '📍 Sender drops off'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery</Text>
          <Text style={styles.detailValue}>
            {booking.dropoff_type === 'home_delivery' ? '🏠 Home delivery' : '📦 Recipient pickup'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={[styles.detailValue, styles.price]}>€{booking.price_eur}</Text>
        </View>
      </View>

      {isPending && onConfirm && onReject ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={(e) => { e.stopPropagation(); onReject(); }}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn]}
            onPress={(e) => { e.stopPropagation(); onConfirm(); }}
          >
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.footerHint}>Tap for details</Text>
          <ChevronRight size={14} color={Colors.text.tertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  senderInfo: { flex: 1 },
  senderName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  packageMeta: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  details: { gap: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  detailValue: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '500' },
  price: { fontWeight: '700', color: Colors.success },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: Colors.errorLight,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
  },
  rejectText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.error },
  confirmText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  footerHint: { fontSize: FontSize.xs, color: Colors.text.tertiary },
});
