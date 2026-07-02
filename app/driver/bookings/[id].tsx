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
import { ArrowLeft, Phone, ScanLine, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/shared/ui/primitives/Button';
import { StatusBadge } from '@/components/shared/ui/primitives/StatusBadge';
import { QrScannerModal } from '@/components/shared/ui/modals/QrScannerModal';
import type { BookingStatus } from '@/constants/bookingStatus';
import { formatDate } from '@/utils/formatters';

const MANUAL_PAYMENT_TYPES = new Set(['cash_on_collection', 'cash_on_delivery']);

export default function DriverBookingDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const {
    bookings,
    fetchBookings,
    confirmBooking,
    rejectBooking,
    markInTransit,
    markDelivered,
    markPaid,
    isLoading,
  } = useDriverBookingStore();
  const { showToast } = useUIStore();
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (profile) fetchBookings(profile.id);
  }, [id]);

  const booking = bookings.find((b) => b.id === id);
  const sender = booking?.sender as { full_name?: string; phone?: string } | undefined;
  const isManualPayment = booking
    ? MANUAL_PAYMENT_TYPES.has(booking.payment_type ?? '')
    : false;
  const isPaymentPending =
    isManualPayment && booking?.payment_status === 'unpaid';
  const showPaymentSection =
    isManualPayment &&
    (booking?.status === 'confirmed' ||
      booking?.status === 'in_transit' ||
      booking?.status === 'delivered');

  const handleAction = (label: string, action: () => Promise<void>, message: string) => {
    Alert.alert(label, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          try {
            await action();
            showToast(`Booking ${label.toLowerCase()}d`, 'success');
          } catch {
            showToast(t('bookingDetail.toast.failed'), 'error');
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
          <Text style={styles.navTitle}>{t('bookingDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{t('bookingDetail.notFound')}</Text>
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
        <Text style={styles.navTitle}>{t('bookingDetail.title')}</Text>
        <StatusBadge status={booking.status as BookingStatus} showIcon={false} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Sender info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('bookingDetail.sections.sender')}</Text>
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
          <Text style={styles.cardTitle}>{t('bookingDetail.sections.package')}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.category')}</Text>
              <Text style={styles.gridValue}>{booking.package_category}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.weight')}</Text>
              <Text style={styles.gridValue}>{booking.package_weight_kg} kg</Text>
            </View>
            {booking.declared_value_eur && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t('bookingDetail.labels.declaredValue')}</Text>
                <Text style={styles.gridValue}>€{booking.declared_value_eur}</Text>
              </View>
            )}
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.totalPrice')}</Text>
              <Text style={[styles.gridValue, styles.price]}>€{booking.price_eur}</Text>
            </View>
          </View>
          {booking.driver_notes && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.senderNotes')}</Text>
              <Text style={styles.notesText}>{booking.driver_notes}</Text>
            </View>
          )}
        </View>

        {/* Logistics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('bookingDetail.sections.logistics')}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.pickup')}</Text>
              <Text style={styles.gridValue}>
                {booking.pickup_type === 'driver_pickup' ? t('bookingDetail.logisticsValues.driverCollects') : t('bookingDetail.logisticsValues.senderDropsOff')}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.delivery')}</Text>
              <Text style={styles.gridValue}>
                {booking.dropoff_type === 'home_delivery' ? t('bookingDetail.logisticsValues.homeDelivery') : t('bookingDetail.logisticsValues.recipientPickup')}
              </Text>
            </View>
          </View>
          {booking.pickup_address && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.pickupAddress')}</Text>
              <Text style={styles.notesText}>{booking.pickup_address}</Text>
            </View>
          )}
          {booking.dropoff_address && (
            <View style={styles.notesRow}>
              <Text style={styles.gridLabel}>{t('bookingDetail.labels.deliveryAddress')}</Text>
              <Text style={styles.notesText}>{booking.dropoff_address}</Text>
            </View>
          )}
        </View>

        {/* Status actions */}
        <View style={styles.actionsCard}>
          {booking.status === 'pending' && (
            <>
              <Button
                label={t('bookingDetail.actions.confirm')}
                onPress={() =>
                  handleAction(t('bookingDetail.alerts.confirmTitle'), () => confirmBooking(id), t('bookingDetail.alerts.confirmMsg'))
                }
                isLoading={isLoading}
                size="lg"
              />
              <Button
                label={t('bookingDetail.actions.reject')}
                onPress={() =>
                  handleAction(t('bookingDetail.alerts.rejectTitle'), () => rejectBooking(id), t('bookingDetail.alerts.rejectMsg'))
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
                <Text style={styles.scanBtnText}>{t('bookingDetail.actions.scanQR')}</Text>
              </TouchableOpacity>
              <Button
                label={t('bookingDetail.actions.markInTransit')}
                onPress={() =>
                  handleAction(t('bookingDetail.alerts.inTransitTitle'), () => markInTransit(id), t('bookingDetail.alerts.inTransitMsg'))
                }
                isLoading={isLoading}
                size="lg"
                variant="outline"
              />
            </>
          )}

          {booking.status === 'in_transit' && (
            <Button
              label={t('bookingDetail.actions.markDelivered')}
              onPress={() =>
                handleAction(t('bookingDetail.alerts.deliveredTitle'), () => markDelivered(id), t('bookingDetail.alerts.deliveredMsg'))
              }
              isLoading={isLoading}
              size="lg"
            />
          )}
        </View>

        {/* ── Manual payment tracking ─────────────────────────── */}
        {showPaymentSection && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAYMENT</Text>
            {isPaymentPending ? (
              <>
                <Text style={styles.paymentHint}>
                  {booking.payment_type === 'cash_on_collection'
                    ? 'Collect cash from sender at pickup'
                    : 'Collect cash from recipient at delivery'}
                </Text>
                <Button
                  label="Mark as Paid"
                  variant="outline"
                  size="md"
                  isLoading={isLoading}
                  onPress={() =>
                    handleAction(
                      'Mark as Paid',
                      () => markPaid(id),
                      'Confirm you have received the cash or bank transfer for this booking?',
                    )
                  }
                />
              </>
            ) : (
              <View style={styles.paidRow}>
                <CheckCircle2 size={18} color={Colors.success} strokeWidth={2} />
                <Text style={styles.paidText}>
                  {'Cash received'}
                  {booking.paid_at ? ` · ${formatDate(booking.paid_at)}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <QrScannerModal
        visible={scannerVisible}
        expectedBookingId={id}
        onSuccess={async () => {
          try {
            await markInTransit(id);
            showToast(t('bookingDetail.toast.inTransit'), 'success');
          } catch {
            showToast(t('bookingDetail.toast.updateFailed'), 'error');
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
  paymentHint: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  paidText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.success,
  },
});
