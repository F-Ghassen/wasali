import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Printer, Lock, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPrice } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';
import type { BookingWithRoute } from '@/types/models';
import type { BookingStatus } from '@/constants/bookingStatus';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingWithDriver = BookingWithRoute & {
  route?: BookingWithRoute['route'] & {
    estimated_arrival_date?: string | null;
    driver?: { full_name: string | null; phone: string | null } | null;
  };
  recipient_name?: string | null;
  recipient_phone?: string | null;
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

type StepState = 'done' | 'current' | 'pending';

const TIMELINE_STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'pending',    label: 'Booking received' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered',  label: 'Delivered' },
];

function stepState(stepKey: BookingStatus, currentStatus: BookingStatus): StepState {
  const order: BookingStatus[] = ['pending', 'confirmed', 'in_transit', 'delivered'];
  const stepIdx    = order.indexOf(stepKey);
  const currentIdx = order.indexOf(currentStatus);
  if (stepIdx < currentIdx)  return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

function stepSubtitle(
  key: BookingStatus,
  state: StepState,
  booking: BookingWithDriver,
): string {
  const destCity  = booking.route?.destination_city_id ?? 'destination';
  const weightKg  = booking.package_weight_kg ?? 0;
  const updatedAt = booking.updated_at ? formatDate(booking.updated_at as string) : undefined;

  switch (key) {
    case 'pending':
      return 'Awaiting driver confirmation';
    case 'confirmed':
      return state === 'done' || state === 'current'
        ? `${updatedAt ? updatedAt + ' · ' : ''}Payment secured in escrow`
        : 'Payment will be held in escrow';
    case 'in_transit':
      return state === 'done' || state === 'current'
        ? `${updatedAt ? updatedAt + ' · ' : ''}${weightKg} kg · En route to ${destCity}`
        : `En route to ${destCity}`;
    case 'delivered':
      return state === 'done'
        ? `${updatedAt ? updatedAt + ' · ' : ''}Confirmed by driver`
        : state === 'current'
        ? 'Confirming delivery…'
        : 'Pending';
    default:
      return '';
  }
}

function TimelineStep({
  step, state, isLast, booking,
}: {
  step: { key: BookingStatus; label: string };
  state: StepState;
  isLast: boolean;
  booking: BookingWithDriver;
}) {
  const isDone    = state === 'done';
  const isCurrent = state === 'current';

  return (
    <View style={tl.row}>
      <View style={tl.dotCol}>
        <View style={[tl.dot, isDone && tl.dotDone, isCurrent && tl.dotCurrent, !isDone && !isCurrent && tl.dotPending]}>
          {isDone ? (
            <Check size={12} color={Colors.white} strokeWidth={3} />
          ) : isCurrent ? (
            <View style={tl.dotCurrentInner} />
          ) : null}
        </View>
        {!isLast && <View style={[tl.line, isDone && tl.lineDone]} />}
      </View>
      <View style={tl.body}>
        <Text style={[tl.label, isDone && tl.labelDone, isCurrent && tl.labelCurrent, !isDone && !isCurrent && tl.labelPending]}>
          {step.label}
        </Text>
        <Text style={[tl.subtitle, !isDone && !isCurrent && tl.subtitlePending]}>
          {stepSubtitle(step.key, state, booking)}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const [booking, setBooking] = useState<BookingWithDriver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [labelVisible, setLabelVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, route:routes(*, route_stops(*), driver:profiles!driver_id(full_name, phone))')
        .eq('id', id)
        .single();
      setBooking(data as unknown as BookingWithDriver);
      setIsLoading(false);
    };
    load();

    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => setBooking((prev) => prev ? { ...prev, ...payload.new } : null)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleWhatsApp = () => {
    const phone = booking?.route?.driver?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'The driver has not shared a phone number.');
      return;
    }
    const ref = id ? `#BOOK-${id.slice(0, 8).toUpperCase()}` : '';
    const lines = [
      `📦 Booking ${ref}`,
      ``,
      `🗺  Route: ${booking.route?.origin_city_id} → ${booking.route?.destination_city_id}`,
      booking.route?.departure_date ? `📅 Departure: ${formatDate(booking.route.departure_date)}` : null,
      ``,
      `⚖️  Weight: ${booking.package_weight_kg} kg`,
      booking.package_category ? `📦 Category: ${booking.package_category}` : null,
      `💶 Total: ${formatPrice(booking.price_eur)}`,
    ].filter(Boolean).join('\n');

    const normalised = phone.replace(/\s+/g, '');
    Linking.openURL(`whatsapp://send?phone=${normalised}&text=${encodeURIComponent(lines)}`).catch(() =>
      Alert.alert('WhatsApp not available', 'Could not open WhatsApp.')
    );
  };

  const handleCallDriver = () => {
    const phone = booking?.route?.driver?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'The driver has not shared a phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Cannot call', 'Could not open the phone app.')
    );
  };

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
    originCity:            booking.route?.origin_city_id ?? '—',
    originFlag:            '🇪🇺',
    destCity:              booking.route?.destination_city_id ?? '—',
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
              {booking.route?.origin_city_id} → {booking.route?.destination_city_id}
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
            <Lock size={13} color={Colors.success} strokeWidth={2} />
            <Text style={styles.escrowBannerText}>Payment held in escrow until delivery</Text>
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

        {/* ── Call driver ───────────────────────────────────── */}
        <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver} activeOpacity={0.85}>
          <Text style={styles.callBtnText}>📞  Call driver</Text>
        </TouchableOpacity>

        {/* ── WhatsApp driver ───────────────────────────────── */}
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
          <Text style={styles.whatsappBtnText}>💬  Message driver on WhatsApp</Text>
        </TouchableOpacity>

        {/* ── Print shipping label ──────────────────────────── */}
        {labelData && (
          <TouchableOpacity style={styles.printBtn} onPress={() => setLabelVisible(true)} activeOpacity={0.85}>
            <Printer size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.printBtnText}>Print shipping label</Text>
          </TouchableOpacity>
        )}

        {/* ── Rate driver ───────────────────────────────────── */}
        {booking.status === 'delivered' && (
          <Button
            label="Rate Driver"
            onPress={() => router.push(`/post-delivery/rate/${booking.id}`)}
            variant="outline"
            size="lg"
          />
        )}

        {/* ── Report a problem ──────────────────────────────── */}
        {(booking.status === 'confirmed' || booking.status === 'in_transit') && (
          <Button
            label="Report a Problem"
            onPress={() => router.push(`/post-delivery/dispute/${booking.id}`)}
            variant="ghost"
            size="md"
          />
        )}

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
});

// ─── Timeline styles ──────────────────────────────────────────────────────────

const tl = StyleSheet.create({
  row:    { flexDirection: 'row', gap: Spacing.md },
  dotCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border.medium,
    backgroundColor: Colors.background.secondary,
  },
  dotDone:         { backgroundColor: Colors.success, borderColor: Colors.success },
  dotCurrent:      { backgroundColor: Colors.white, borderColor: Colors.success, borderWidth: 2.5 },
  dotCurrentInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  dotPending:      { backgroundColor: Colors.background.tertiary, borderColor: Colors.border.light },
  line:     { flex: 1, width: 2, minHeight: 32, backgroundColor: Colors.border.light, marginVertical: 2 },
  lineDone: { backgroundColor: Colors.success },
  body:     { flex: 1, paddingBottom: Spacing.lg, gap: 3 },
  label:          { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  labelDone:      { color: Colors.text.primary },
  labelCurrent:   { color: Colors.success },
  labelPending:   { color: Colors.text.tertiary, fontWeight: '500' },
  subtitle:        { fontSize: FontSize.sm, color: Colors.text.secondary },
  subtitlePending: { color: Colors.text.tertiary },
});
