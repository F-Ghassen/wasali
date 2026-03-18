import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, ScanLine } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QrScannerModal } from '@/components/driver/QrScannerModal';
import type { BookingStatus } from '@/constants/bookingStatus';

export default function DriverBookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const {
    bookings,
    fetchBookings,
    confirmBooking,
    rejectBooking,
    markInTransit,
    markDelivered,
    isLoading,
  } = useDriverBookingStore();
  const { showToast } = useUIStore();
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (profile) fetchBookings(profile.id);
  }, [id]);

  const booking = bookings.find((b) => b.id === id);
  const sender = booking?.sender as { full_name?: string; phone?: string } | undefined;

  const handleAction = (label: string, action: () => Promise<void>, message: string) => {
    Alert.alert(label, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          try {
            await action();
            showToast(`Booking ${label.toLowerCase()}d`, 'success');
          } catch {
            showToast('Action failed. Please try again.', 'error');
          }
        },
      },
    ]);
  };

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Booking Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Booking Detail</Text>
        <StatusBadge status={booking.status as BookingStatus} showIcon={false} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Sender info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sender</Text>
          <Text style={styles.senderName}>{sender?.full_name ?? '—'}</Text>
          {sender?.phone && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={() => Linking.openURL(`tel:${sender.phone}`)}
            >
              <Phone size={14} color={Colors.secondary} />
              <Text style={styles.phoneText}>{sender.phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Package details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Category</Text>
              <Text style={styles.gridValue}>{booking.package_category}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Weight</Text>
              <Text style={styles.gridValue}>{booking.package_weight_kg} kg</Text>
            </View>
            {booking.declared_value_eur && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Declared Value</Text>
                <Text style={styles.gridValue}>€{booking.declared_value_eur}</Text>
              </View>
            )}
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Total Price</Text>
              <Text style={[styles.gridValue, styles.price]}>€{booking.price_eur}</Text>
            </View>
          </View>
          {booking.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>Sender notes</Text>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          )}
        </View>

        {/* Logistics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logistics</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Pickup</Text>
              <Text style={styles.gridValue}>
                {booking.pickup_type === 'driver_pickup' ? 'Driver collects' : 'Sender drops off'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Delivery</Text>
              <Text style={styles.gridValue}>
                {booking.dropoff_type === 'home_delivery' ? 'Home delivery' : 'Recipient pickup'}
              </Text>
            </View>
          </View>
          {booking.pickup_address && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>Pickup address</Text>
              <Text style={styles.notesText}>{booking.pickup_address}</Text>
            </View>
          )}
          {booking.dropoff_address && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>Delivery address</Text>
              <Text style={styles.notesText}>{booking.dropoff_address}</Text>
            </View>
          )}
        </View>

        {/* Status actions */}
        <View style={styles.actionsCard}>
          {booking.status === 'pending' && (
            <>
              <Button
                label="Confirm Booking"
                onPress={() =>
                  handleAction('Confirm', () => confirmBooking(id), 'Accept this booking and notify the sender?')
                }
                isLoading={isLoading}
                size="lg"
              />
              <Button
                label="Reject Booking"
                onPress={() =>
                  handleAction('Reject', () => rejectBooking(id), 'Reject this booking? The sender will be notified.')
                }
                variant="destructive"
                size="md"
              />
            </>
          )}

          {booking.status === 'confirmed' && (
            <>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setScannerVisible(true)}
                disabled={isLoading}
              >
                <ScanLine size={18} color={Colors.white} />
                <Text style={styles.scanBtnText}>Scan Sender's QR</Text>
              </TouchableOpacity>
              <Button
                label="Mark as In Transit"
                onPress={() =>
                  handleAction('Mark In Transit', () => markInTransit(id), 'Confirm you have picked up this package?')
                }
                isLoading={isLoading}
                size="lg"
                variant="outline"
              />
            </>
          )}

          {booking.status === 'in_transit' && (
            <Button
              label="Mark as Delivered"
              onPress={() =>
                handleAction('Mark Delivered', () => markDelivered(id), 'Confirm this package has been delivered?')
              }
              isLoading={isLoading}
              size="lg"
            />
          )}
        </View>
      </ScrollView>

      <QrScannerModal
        visible={scannerVisible}
        expectedBookingId={id}
        onSuccess={async () => {
          try {
            await markInTransit(id);
            showToast('Package marked as in transit', 'success');
          } catch {
            showToast('Failed to update status', 'error');
          }
        }}
        onClose={() => setScannerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
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
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  senderName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  phoneText: { fontSize: FontSize.base, color: Colors.secondary, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { minWidth: '45%' },
  gridLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  gridValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  price: { color: Colors.success },
  notesRow: { gap: 4 },
  notesText: { fontSize: FontSize.sm, color: Colors.text.secondary },
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FontSize.base, color: Colors.text.secondary },
});
