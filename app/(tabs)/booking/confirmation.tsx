import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Printer, Check, Truck, MapPin, Star, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useBookingStore } from '@/stores/bookingStore';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';

// ─── ConfirmationScreen ───────────────────────────────────────────────────────

export default function ConfirmationScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { lastBooking, reset } = useBookingStore();
  const [labelVisible, setLabelVisible] = useState(false);

  // Animated spring for the check icon
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1, useNativeDriver: true,
        tension: 50, friction: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const ref = bookingId ? `#BOOK-${bookingId.slice(0, 8).toUpperCase()}` : '';

  function handleWhatsApp() {
    if (!lastBooking?.driverPhone) return;

    const deepLink = `wasali://driver/bookings/${bookingId}`;
    const lines = [
      `📦 New shipment booking ${ref}`,
      ``,
      `🗺  Route: ${lastBooking.collectionStopCity} → ${lastBooking.dropoffStopCity}`,
      lastBooking.collectionStopDate ? `📅 Collection: ${formatDateShort(lastBooking.collectionStopDate)}` : null,
      lastBooking.dropoffStopDate    ? `📅 Drop-off:   ${formatDateShort(lastBooking.dropoffStopDate)}`   : null,
      ``,
      `👤 Sender:    ${lastBooking.senderName}`,
      `👤 Recipient: ${lastBooking.recipientName}`,
      lastBooking.recipientPhone ? `📞 Recipient phone: ${lastBooking.recipientPhone}` : null,
      ``,
      `⚖️  Weight: ${lastBooking.packageWeightKg} kg`,
      lastBooking.packageTypes.length > 0 ? `📦 Contents: ${lastBooking.packageTypes.join(', ')}` : null,
      ``,
      `💳 Payment: ${paymentLabel(lastBooking.paymentType)}`,
      `💶 Total: €${lastBooking.totalPrice.toFixed(2)}`,
      ``,
      `👉 Open in Wasali driver app to confirm or decline:`,
      deepLink,
    ].filter(Boolean).join('\n');

    const phone = lastBooking.driverPhone.replace(/\s+/g, '');
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(lines)}`);
  }

  const SERVICE_DELIVERY_LABEL: Record<string, string> = {
    driver_delivery:    'Home delivery',
    recipient_collects: 'Self-collect',
    local_post:         'Local post',
  };

  const labelData: LabelData | null = lastBooking && bookingId ? {
    trackingId:            `WSL-${bookingId.slice(0, 6).toUpperCase()}`,
    originCity:            lastBooking.collectionStopCity,
    originFlag:            '🇪🇺',
    destCity:              lastBooking.dropoffStopCity,
    destFlag:              '🇹🇳',
    departureDate:         lastBooking.collectionStopDate ? formatDateShort(lastBooking.collectionStopDate) : '—',
    arrivalDate:           lastBooking.dropoffStopDate    ? formatDateShort(lastBooking.dropoffStopDate)    : '—',
    driverName:            lastBooking.driverName ?? '—',
    driverRating:          0,
    driverTrips:           0,
    senderName:            lastBooking.senderName,
    senderPhone:           '',
    recipientName:         lastBooking.recipientName,
    recipientPhone:        lastBooking.recipientPhone,
    recipientAddressLine1: '',
    recipientAddressLine2: '',
    weightKg:              lastBooking.packageWeightKg,
    deliveryMethod:        SERVICE_DELIVERY_LABEL[lastBooking.deliveryServiceType ?? ''] ?? 'Standard',
  } : null;

  function handleViewBookings() {
    router.push('/(tabs)/bookings' as any);
  }

  function handleBackToSearch() {
    reset();
    router.push('/(tabs)/' as any);
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Check icon ───────────────────────────────────── */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale }], opacity }]}>
          <CheckCircle size={64} color={Colors.success} strokeWidth={1.5} />
        </Animated.View>

        {/* ── Heading ──────────────────────────────────────── */}
        <Text style={s.heading}>Booking submitted!</Text>
        <Text style={s.sub}>The driver will confirm shortly</Text>

        {/* ── Reference ────────────────────────────────────── */}
        {ref ? (
          <View style={s.refBadge}>
            <Text style={s.refText}>{ref}</Text>
          </View>
        ) : null}

        {/* ── Summary card ─────────────────────────────────── */}
        {lastBooking && (
          <View style={s.summaryCard}>
            <Row
              label="Route"
              value={`${lastBooking.collectionStopCity} → ${lastBooking.dropoffStopCity}`}
            />
            {lastBooking.collectionStopDate ? (
              <Row label="Collection" value={formatDateShort(lastBooking.collectionStopDate)} />
            ) : null}
            {lastBooking.dropoffStopDate ? (
              <Row label="Drop-off" value={formatDateShort(lastBooking.dropoffStopDate)} />
            ) : null}
            {lastBooking.packageWeightKg > 0 ? (
              <Row label="Weight" value={`${lastBooking.packageWeightKg} kg`} />
            ) : null}
            {lastBooking.recipientName ? (
              <Row label="Recipient" value={lastBooking.recipientName} />
            ) : null}
            {lastBooking.paymentType ? (
              <Row label="Payment" value={paymentLabel(lastBooking.paymentType)} />
            ) : null}
            {lastBooking.totalPrice > 0 ? (
              <Row label="Total" value={`€${lastBooking.totalPrice.toFixed(2)}`} bold />
            ) : null}
            {lastBooking.driverName ? (
              <Row label="Driver" value={lastBooking.driverName} />
            ) : null}
          </View>
        )}

        {/* ── Tracking timeline ────────────────────────────── */}
        <BookingTimeline />

        {/* ── WhatsApp button ───────────────────────────────── */}
        {lastBooking?.driverPhone && (
          <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
            <Text style={s.whatsappBtnText}>💬  Message driver on WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* ── Print shipping label ─────────────────────────── */}
        {labelData && (
          <TouchableOpacity style={s.printBtn} onPress={() => setLabelVisible(true)} activeOpacity={0.85}>
            <Printer size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={s.printBtnText}>Print shipping label</Text>
          </TouchableOpacity>
        )}

        {/* ── Primary CTA ──────────────────────────────────── */}
        <TouchableOpacity style={s.primaryBtn} onPress={handleViewBookings} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>View my bookings</Text>
        </TouchableOpacity>

        {/* ── Back to search ────────────────────────────────── */}
        <TouchableOpacity style={s.ghostBtn} onPress={handleBackToSearch} activeOpacity={0.75}>
          <Text style={s.ghostBtnText}>← Back to search</Text>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────


function paymentLabel(type: string): string {
  const map: Record<string, string> = {
    cash_on_collection: 'Cash on collection',
    cash_on_delivery:   'Cash on delivery',
    credit_debit_card:  'Card',
    paypal:             'PayPal',
  };
  return map[type] ?? type;
}

// ─── Booking timeline (static — all steps pending at submission) ───────────────

const TIMELINE_STEPS = [
  {
    icon: <Check size={13} color={Colors.white} strokeWidth={3} />,
    label: 'Booking confirmed',
    desc:  'Driver accepts your request',
  },
  {
    icon: <Truck size={13} color={Colors.white} strokeWidth={2.5} />,
    label: 'In transit',
    desc:  'Package collected and on the way',
  },
  {
    icon: <MapPin size={13} color={Colors.white} strokeWidth={2.5} />,
    label: 'Delivered',
    desc:  'Package handed over to recipient',
  },
  {
    icon: <Star size={13} color={Colors.white} strokeWidth={2.5} />,
    label: 'Rate & complete',
    desc:  'Leave a review for your driver',
  },
];

function BookingTimeline() {
  return (
    <View style={tl.wrap}>
      <Text style={tl.heading}>What happens next</Text>
      {TIMELINE_STEPS.map((step, i) => {
        const isLast = i === TIMELINE_STEPS.length - 1;
        return (
          <View key={step.label} style={tl.row}>
            <View style={tl.dotCol}>
              <View style={tl.dot}>{step.icon}</View>
              {!isLast && <View style={tl.line} />}
            </View>
            <View style={tl.body}>
              <Text style={tl.label}>{step.label}</Text>
              <Text style={tl.desc}>{step.desc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heading: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  dotCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  line: { width: 2, flex: 1, backgroundColor: Colors.border.light, marginVertical: 4 },
  body: { flex: 1, paddingBottom: Spacing.base },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, marginTop: 4 },
  desc:  { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2, lineHeight: 16 },
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowValueBold]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },

  iconWrap: { marginBottom: Spacing.md },
  heading: {
    fontSize: FontSize['2xl'],
    fontWeight: '900',
    color: Colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  refBadge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  refText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  summaryCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  rowValue: {
    fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary,
    textAlign: 'right', flex: 1, marginLeft: Spacing.sm,
  },
  rowValueBold: { fontWeight: '800', fontSize: FontSize.base },

  whatsappBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  whatsappBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  printBtn: {
    width: '100%',
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

  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  ghostBtn: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ghostBtnText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.secondary },
});
