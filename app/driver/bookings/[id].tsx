import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { QrScannerModal, ConfirmActionModal } from '@/components/shared/ui/modals';
import {
  BookingNavBar,
  SenderInfoCard,
  RecipientInfoCard,
  TripInfoCard,
  PackageInfoCard,
  PackagePhotoGallery,
  LogisticsInfoCard,
  PayoutCard,
  PaymentTrackingCard,
  WeightConfirmModal,
  DisputedBanner,
  CancellationBanner,
  BookingActionsCard,
} from '@/components/driver/bookings';
import { isCashPaymentType, type BookingStatus, type CancellationReason } from '@/constants/bookingStatus';
import { useDriverBookingActions } from './hooks/useDriverBookingActions';
import { useWeightAdjustment } from './hooks/useWeightAdjustment';
import type { DriverBookingDetail } from './types/index';

export default function DriverBookingDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const { bookings, fetchBookings, isInitialized } = useDriverBookingStore();
  const [scannerVisible, setScannerVisible] = useState(false);

  // Bug fix: previously depended on [id] only — on a cold deep-link (push
  // notification → detail screen) where `profile` loads after mount, the
  // fetch never re-fired and the screen permanently showed "not found."
  useEffect(() => {
    if (profile) fetchBookings(profile.id);
  }, [id, profile?.id]);

  const booking = bookings.find((b) => b.id === id) as DriverBookingDetail | undefined;

  const { confirm, reject, deliver, markAsPaid, isLoading: actionsLoading, confirmModal } = useDriverBookingActions(id);
  const {
    modalVisible, weightInput, setWeightInput, isSubmitting, error: weightError,
    openModal, closeModal, confirmAndProceed,
  } = useWeightAdjustment(id, booking?.package_weight_kg ?? 0);

  // Bug fix: the driver screen previously had no loading state — on first
  // mount `bookings` was [], so `booking` was undefined and it rendered the
  // full "not found" screen for a beat before the fetch resolved.
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <BookingNavBar title={t('bookingDetail.title')} onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{t('bookingDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = booking.status as BookingStatus;
  const isManualPayment = isCashPaymentType(booking.payment_type);
  const isPaymentPending = isManualPayment && booking.payment_status === 'unpaid';
  const showPaymentSection = isManualPayment && (status === 'confirmed' || status === 'in_transit' || status === 'delivered');
  const routePaymentMethods = booking.route?.route_payment_methods ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <BookingNavBar
        title={t('bookingDetail.title')}
        reference={id.slice(0, 8).toUpperCase()}
        status={status}
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {status === 'disputed' && <DisputedBanner />}
        {status === 'cancelled' && <CancellationBanner reason={booking.cancellation_reason as CancellationReason | null} />}

        <SenderInfoCard
          fullName={booking.sender?.full_name}
          phone={booking.sender?.phone}
          rating={booking.sender?.rating}
          completedTrips={booking.sender?.completed_trips}
        />

        <TripInfoCard booking={booking} />

        <PackageInfoCard
          categories={booking.package_categories && booking.package_categories.length > 0 ? booking.package_categories : [booking.package_category]}
          weightKg={booking.package_weight_kg}
          declaredValueEur={booking.declared_value_eur}
          estimatedCollectionDate={booking.estimated_collection_date}
          requestedAt={booking.created_at}
        />

        <PackagePhotoGallery paths={booking.package_photos ?? []} />

        <LogisticsInfoCard
          pickupType={booking.pickup_type}
          dropoffType={booking.dropoff_type}
          pickupAddress={booking.pickup_address}
          dropoffAddress={booking.dropoff_address}
          noteFromSender={booking.driver_notes}
        />

        <RecipientInfoCard
          name={booking.recipient_name}
          phone={booking.recipient_phone}
          whatsapp={booking.recipient_whatsapp}
          addressStreet={booking.recipient_address_street}
          addressCity={booking.recipient_address_city}
          addressPostalCode={booking.recipient_address_postal_code}
        />

        <PayoutCard senderPaidEur={booking.price_eur} driverPayoutEur={booking.driver_payout_eur} />

        <BookingActionsCard
          status={status}
          isLoading={actionsLoading}
          onConfirm={confirm}
          onReject={reject}
          onScanQr={() => setScannerVisible(true)}
          onMarkInTransit={openModal}
          onMarkDelivered={deliver}
        />

        {showPaymentSection && (
          <PaymentTrackingCard
            paymentType={booking.payment_type}
            isPaymentPending={isPaymentPending}
            paidAt={booking.paid_at}
            routePaymentMethods={routePaymentMethods}
            isLoading={actionsLoading}
            onMarkPaid={markAsPaid}
          />
        )}
      </ScrollView>

      <QrScannerModal
        visible={scannerVisible}
        expectedBookingId={id}
        onSuccess={() => {
          setScannerVisible(false);
          openModal();
        }}
        onClose={() => setScannerVisible(false)}
      />

      <WeightConfirmModal
        visible={modalVisible}
        bookedWeightKg={booking.package_weight_kg}
        weightInput={weightInput}
        onWeightInputChange={setWeightInput}
        isSubmitting={isSubmitting}
        error={weightError}
        onConfirm={confirmAndProceed}
        onClose={closeModal}
      />

      <ConfirmActionModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        destructive={confirmModal.destructive}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={confirmModal.onClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FontSize.base, color: Colors.text.secondary },
});
