// BookingDetail - shows booking status, timeline, and tracking
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Printer, CheckCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPrice } from '@/utils/formatters';
import { useAuthStore } from '@/stores/authStore';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';
import type { BookingStatus } from '@/constants/bookingStatus';
import { TimelineStep } from './components/TimelineStep';
import { useBookingDetail } from './hooks/useBookingDetail';
import { useBookingActions } from './hooks/useBookingActions';
import { stepState } from './utils/stepState';
import { getOriginCity, getDestinationCity } from './utils/routeCities';
import { TIMELINE_STEPS } from './types/index';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const { booking, isLoading } = useBookingDetail(id);
  const { handleWhatsApp: whatsAppAction } = useBookingActions(id, profile);
  const [labelVisible, setLabelVisible] = useState(false);
  const [isNewBooking, setIsNewBooking] = useState(false);

  // Celebration animation
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if this is a newly created booking (just submitted)
    if (booking && booking.status === 'pending' && booking.created_at) {
      const createdAt = new Date(booking.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const isNew = diffMs < 5000; // Within 5 seconds = new booking

      if (isNew) {
        setIsNewBooking(true);
        // Animate the check icon
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 6,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
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

  const labelData: LabelData | null = booking && id ? {
    trackingId:            `WSL-${id.slice(0, 6).toUpperCase()}`,
    originCity:            getOriginCity(booking),
    originFlag:            '🇪🇺',
    destCity:              getDestinationCity(booking),
    destFlag:              '🇹🇳',
    departureDate:         booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—',
    arrivalDate:           booking.route?.estimated_arrival_date
                             ? formatDate(booking.route.estimated_arrival_date)
                             : '—',
    driverName:            booking.route?.driver?.full_name ?? '—',
    driverRating:          (booking.route?.driver as any)?.rating ?? 0,
    driverTrips:           (booking.route?.driver as any)?.completed_trips ?? 0,
    senderName:            profile?.full_name ?? '—',
    senderPhone:           profile?.phone ?? '',
    recipientName:         booking.recipient_name ?? '—',
    recipientPhone:        booking.recipient_phone ?? '',
    recipientAddressLine1: '',
    recipientAddressLine2: '',
    weightKg:              Number(booking.package_weight_kg),
    deliveryMethod:        booking.package_category ?? 'Standard',
  } : null;

  return (
    <SafeAreaView style={styles.container}>
      {isNewBooking && (
        <View style={styles.celebrationOverlay}>
          <Animated.View
            style={[
              styles.celebrationContent,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <CheckCircle size={80} color={Colors.success} strokeWidth={1.5} />
            <Text style={styles.celebrationTitle}>Booking submitted!</Text>
            <Text style={styles.celebrationSubtitle}>
              Your shipment is now pending driver confirmation
            </Text>
            <TouchableOpacity
              style={styles.celebrationBtn}
              onPress={() => setIsNewBooking(false)}
            >
              <Text style={styles.celebrationBtnText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('bookingDetail.title')}</Text>
          {id && <Text style={styles.headerId}>#{id.slice(0, 8).toUpperCase()}</Text>}
        </View>
        <StatusBadge status={currentStatus} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Route summary card ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <Text style={styles.route}>
              {getOriginCity(booking)} → {getDestinationCity(booking)}
            </Text>
            <Text style={styles.amount}>€{Number(booking.price_eur).toFixed(2)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.date}>
              Departure: {booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—'}
            </Text>
            {booking.route?.estimated_arrival_date && (
              <Text style={styles.date}>
                Est. arrival: {formatDate(booking.route.estimated_arrival_date)}
              </Text>
            )}
          </View>
          <View style={styles.escrowBanner}>
            <Text style={styles.escrowBannerText}>🔒 Payment held in escrow until delivery</Text>
          </View>
        </View>

        {/* ── Status Timeline ───────────────────────────────── */}
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

        {/* ── Pending QR ────────────────────────────────────── */}
        {booking.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Confirmation</Text>
            <Text style={styles.qrHint}>{t('booking.escrow')}</Text>
            <View style={styles.qrContainer}>
              <QRCode value={booking.id} size={180} />
            </View>
          </View>
        )}

        {/* ── Package details ───────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('bookingDetail.sections.package')}</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('bookingDetail.labels.weight')}</Text><Text style={styles.infoValue}>{booking.package_weight_kg} kg</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>{t('bookingDetail.labels.category')}</Text><Text style={styles.infoValue}>{booking.package_category}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>{t('bookingDetail.labels.totalPrice')}</Text><Text style={[styles.infoValue, styles.price]}>{formatPrice(booking.price_eur)}</Text></View>
        </View>

        {/* ── Print shipping label ──────────────────────────── */}
        {labelData && (
          <TouchableOpacity style={styles.printBtn} onPress={() => setLabelVisible(true)} activeOpacity={0.85}>
            <Printer size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.printBtnText}>Print shipping label</Text>
          </TouchableOpacity>
        )}

        {/* ── WhatsApp driver ───────────────────────────────── */}
        <TouchableOpacity style={styles.whatsappBtn} onPress={() => whatsAppAction(booking)} activeOpacity={0.85}>
          <Text style={styles.whatsappBtnText}>💬  Message driver on WhatsApp</Text>
        </TouchableOpacity>

        {/* ── Rate driver ───────────────────────────────────── */}
        {booking.status === 'delivered' && (
          <Button
            label="Rate Driver"
            onPress={() => router.push(`/post-delivery/rate/${booking.id}`)}
            variant="outline"
            size="lg"
          />
        )}

        {/* ── Report an issue ──────────────────────────────── */}
        <Button
          label="Report an Issue"
          onPress={() => router.push(`/post-delivery/dispute/${booking.id}`)}
          variant="ghost"
          size="md"
        />

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back:        { padding: Spacing.sm },
  backText:    { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerId:    { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
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

  // Route card
  routeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  route:     { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  amount:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  dateRow:   { gap: 2, marginBottom: Spacing.md },
  date:      { fontSize: FontSize.sm, color: Colors.text.secondary },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  escrowBannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, fontWeight: '500', lineHeight: 18 },

  // Section title
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md,
  },

  // Package details
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  infoLabel: { fontSize: FontSize.base, color: Colors.text.secondary },
  infoValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  price:     { color: Colors.primary },

  // QR
  qrHint:      { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.md },
  qrContainer: { alignItems: 'center', paddingVertical: Spacing.md },

  // Buttons
  callBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  callBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  whatsappBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  printBtnText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: '700' },

  // Celebration overlay
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
  },
  celebrationTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  celebrationSubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  celebrationBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  celebrationBtnText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
});
