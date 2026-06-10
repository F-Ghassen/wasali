import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Printer, CheckCircle, MessageCircle, AlertTriangle, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StatusBadge } from '@/components/shared/ui/primitives/StatusBadge';
import { formatDate, formatPrice } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';
import type { BookingStatus } from '@/constants/bookingStatus';
import { BOOKING_STATUS_CONFIG } from '@/constants/bookingStatus';
import { TimelineStep } from '@/components/booking/detail/TimelineStep';
import { useBookingDetail } from './hooks/useBookingDetail';
import { useBookingActions } from './hooks/useBookingActions';
import { stepState } from './utils/stepState';
import { getOriginCity, getDestinationCity, getOriginFlag, getDestinationFlag } from './utils/routeCities';
import { TIMELINE_STEPS } from './types/index';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const { booking, isLoading } = useBookingDetail(id);
  const { handleWhatsApp: whatsAppAction, cancelBooking } = useBookingActions(id, profile);
  const [labelVisible, setLabelVisible] = useState(false);
  const [isNewBooking, setIsNewBooking] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  const handleCancelConfirm = async () => {
    setCancelling(true);
    setCancelError(false);
    const ok = await cancelBooking();
    if (ok) {
      router.push('/(sender)/booking' as any);
    } else {
      setCancelling(false);
      setCancelError(true);
    }
  };

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (booking && booking.status === 'pending' && booking.created_at) {
      const createdAt = new Date(booking.created_at);
      const diffMs = new Date().getTime() - createdAt.getTime();
      if (diffMs < 5000) {
        setIsNewBooking(true);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [booking]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const currentStatus = booking.status as BookingStatus;
  const statusConfig = BOOKING_STATUS_CONFIG[currentStatus];
  const originCity = getOriginCity(booking);
  const destCity = getDestinationCity(booking);
  const originFlag = getOriginFlag(booking);
  const destFlag = getDestinationFlag(booking);

  const labelData: LabelData | null = booking && id ? {
    trackingId:            `WSL-${id.slice(0, 6).toUpperCase()}`,
    originCity,
    originFlag,
    destCity,
    destFlag,
    departureDate:         booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—',
    arrivalDate:           booking.route?.estimated_arrival_date ? formatDate(booking.route.estimated_arrival_date) : '—',
    driverName:            booking.route?.driver?.full_name ?? '—',
    driverRating:          (booking.route?.driver as any)?.rating ?? 0,
    driverTrips:           (booking.route?.driver as any)?.completed_trips ?? 0,
    senderName:            profile?.full_name ?? '—',
    senderPhone:           profile?.phone ?? '',
    recipientName:         booking.recipient_name ?? '—',
    recipientPhone:        booking.recipient_phone ?? '',
    recipientAddressLine1: booking.recipient_address_street ?? '',
    recipientAddressLine2: booking.recipient_address_city
      ? `${booking.recipient_address_postal_code ?? ''} ${booking.recipient_address_city}`.trim()
      : '',
    weightKg:              Number(booking.package_weight_kg),
    deliveryMethod:        booking.package_category ?? 'Standard',
  } : null;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── New booking celebration overlay ──────────────── */}
      {isNewBooking && (
        <View style={styles.celebrationOverlay}>
          <Animated.View style={[styles.celebrationContent, { transform: [{ scale }], opacity }]}>
            <CheckCircle size={80} color={Colors.success} strokeWidth={1.5} />
            <Text style={styles.celebrationTitle}>Booking submitted!</Text>
            <Text style={styles.celebrationSubtitle}>
              Your shipment is now pending driver confirmation
            </Text>
            <TouchableOpacity style={styles.celebrationBtn} onPress={() => setIsNewBooking(false)}>
              <Text style={styles.celebrationBtnText}>View Booking</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(sender)/booking' as any)} style={styles.back}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('bookingDetail.title')}</Text>
          {id && <Text style={styles.headerId}>#{id.slice(0, 8).toUpperCase()}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Hero card: route + status + escrow ───────────── */}
        <View style={styles.heroCard}>

          {/* Route visual */}
          <View style={styles.routeVisual}>
            <View style={styles.cityBlock}>
              <Text style={styles.cityFlag}>{originFlag}</Text>
              <Text style={styles.cityName}>{originCity}</Text>
              <Text style={styles.cityDate}>
                {booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—'}
              </Text>
              <Text style={styles.cityDateLabel}>Departure</Text>
            </View>

            <View style={styles.routeLineBlock}>
              <View style={styles.routeLine}>
                <View style={styles.routeDot} />
                <View style={styles.routeDash} />
                <Text style={styles.routePlane}>✈</Text>
                <View style={styles.routeDash} />
                <View style={styles.routeDot} />
              </View>
            </View>

            <View style={[styles.cityBlock, styles.cityBlockRight]}>
              <Text style={styles.cityFlag}>{destFlag}</Text>
              <Text style={styles.cityName}>{destCity}</Text>
              <Text style={styles.cityDate}>
                {booking.route?.estimated_arrival_date
                  ? formatDate(booking.route.estimated_arrival_date)
                  : '—'}
              </Text>
              <Text style={styles.cityDateLabel}>Est. Arrival</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Status pill */}
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Escrow notice */}
          <View style={styles.escrowBanner}>
            <Text style={styles.escrowText}>
              🔒 {formatPrice(booking.price_eur)} held in escrow · released on delivery
            </Text>
          </View>
        </View>

        {/* ── Package pill row ──────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('bookingDetail.sections.package')}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{booking.package_weight_kg} kg</Text>
              <Text style={styles.pillLabel}>Weight</Text>
            </View>
            <View style={styles.pillDivider} />
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{booking.package_category ?? '—'}</Text>
              <Text style={styles.pillLabel}>Category</Text>
            </View>
            <View style={styles.pillDivider} />
            <View style={styles.pill}>
              <Text style={[styles.pillValue, styles.pillPrice]}>{formatPrice(booking.price_eur)}</Text>
              <Text style={styles.pillLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* ── Shipment progress ─────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('tracking.shipmentProgress')}</Text>
          {TIMELINE_STEPS.map((step, i) => (
            <TimelineStep
              key={step.key}
              step={step}
              state={stepState(step.key, currentStatus)}
              isLast={i === TIMELINE_STEPS.length - 1}
              booking={booking}
            />
          ))}
        </View>

        {/* ── QR code (pending only) ────────────────────────── */}
        {booking.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Confirmation</Text>
            <Text style={styles.qrHint}>Show this QR to your driver at pickup</Text>
            <View style={styles.qrContainer}>
              <QRCode value={booking.id} size={180} />
            </View>
          </View>
        )}

        {/* ── Primary actions ───────────────────────────────── */}
        <View style={styles.actionsRow}>
          {labelData && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setLabelVisible(true)} activeOpacity={0.85}>
              <Printer size={18} color={Colors.text.primary} strokeWidth={2} />
              <Text style={styles.actionBtnText}>Print Label</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDark]}
            onPress={() => whatsAppAction(booking)}
            activeOpacity={0.85}
          >
            <MessageCircle size={18} color={Colors.white} strokeWidth={2} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextDark]}>Message Driver</Text>
          </TouchableOpacity>
        </View>

        {/* ── Rate driver (delivered) ───────────────────────── */}
        {booking.status === 'delivered' && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => router.push(`/post-delivery/rate/${booking.id}` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.rateBtnText}>⭐  Rate your Driver</Text>
          </TouchableOpacity>
        )}

        {/* ── Cancel booking (pending only) ─────────────────── */}
        {booking.status === 'pending' && (
          confirmingCancel ? (
            <View style={styles.cancelConfirmBox}>
              <Text style={styles.cancelConfirmText}>Cancel this booking? This cannot be undone.</Text>
              {cancelError && (
                <Text style={styles.cancelErrorText}>Could not cancel. Please try again.</Text>
              )}
              <View style={styles.cancelConfirmRow}>
                <TouchableOpacity
                  style={styles.keepBtn}
                  onPress={() => { setConfirmingCancel(false); setCancelError(false); }}
                  disabled={cancelling}
                >
                  <Text style={styles.keepBtnText}>Keep Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmCancelBtn, cancelling && styles.disabledBtn]}
                  onPress={handleCancelConfirm}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={styles.confirmCancelBtnText}>Yes, Cancel</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setConfirmingCancel(true)}>
              <X size={14} color={Colors.error} strokeWidth={2.5} />
              <Text style={styles.ghostBtnTextDanger}>Cancel Booking</Text>
            </TouchableOpacity>
          )
        )}

        {/* ── Report an issue ───────────────────────────────── */}
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.push(`/post-delivery/dispute/${booking.id}` as any)}
        >
          <AlertTriangle size={14} color={Colors.text.tertiary} strokeWidth={2} />
          <Text style={styles.ghostBtnText}>Report an Issue</Text>
        </TouchableOpacity>

      </ScrollView>

      {labelData && (
        <ShipmentLabelModal
          visible={labelVisible}
          onClose={() => setLabelVisible(false)}
          data={labelData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back:         { padding: Spacing.sm },
  backText:     { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerId:     { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  // Scroll content
  content: {
    padding: Spacing.base,
    gap: Spacing.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },

  // Shared card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.md },

  // ── Hero card ─────────────────────────────────────────────
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  routeVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cityBlock: { alignItems: 'flex-start', flex: 1 },
  cityBlockRight: { alignItems: 'flex-end' },
  cityFlag: { fontSize: 28, marginBottom: Spacing.xs },
  cityName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text.primary },
  cityDate: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, marginTop: 4 },
  cityDateLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },

  routeLineBlock: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xs },
  routeLine: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  routeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.text.tertiary,
  },
  routeDash: { flex: 1, height: 1, backgroundColor: Colors.border.medium },
  routePlane: { fontSize: 16, marginHorizontal: Spacing.xs },

  statusRow: { alignItems: 'center', marginBottom: Spacing.md },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusIcon:  { fontSize: FontSize.base },
  statusLabel: { fontSize: FontSize.sm, fontWeight: '700' },

  escrowBanner: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  escrowText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '500', textAlign: 'center' },

  // ── Package pill row ──────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  pillDivider: { width: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  pillValue: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  pillLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  pillPrice: { color: Colors.primary },

  // QR
  qrHint:      { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.md },
  qrContainer: { alignItems: 'center', paddingVertical: Spacing.md },

  // ── Primary actions row ───────────────────────────────────
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.white,
  },
  actionBtnDark: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  actionBtnTextDark: { color: Colors.white },

  // Rate driver
  rateBtn: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  rateBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gold },

  // Ghost buttons
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  ghostBtnText:       { fontSize: FontSize.sm, color: Colors.text.tertiary },
  ghostBtnTextDanger: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },

  // Cancel confirm
  cancelConfirmBox: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.errorLight,
    gap: Spacing.md,
  },
  cancelConfirmText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600', textAlign: 'center' },
  cancelErrorText:   { fontSize: FontSize.xs, color: Colors.error, textAlign: 'center' },
  cancelConfirmRow:  { flexDirection: 'row', gap: Spacing.sm },
  keepBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center', backgroundColor: Colors.white,
  },
  keepBtnText:        { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
  confirmCancelBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    backgroundColor: Colors.error, alignItems: 'center',
  },
  confirmCancelBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  disabledBtn: { opacity: 0.6 },

  // Celebration overlay
  celebrationOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
    alignItems: 'center', justifyContent: 'center',
  },
  celebrationContent: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', maxWidth: 320,
  },
  celebrationTitle:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  celebrationSubtitle: { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  celebrationBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    width: '100%', alignItems: 'center',
  },
  celebrationBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
