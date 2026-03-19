import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useBookingStore } from '@/stores/bookingStore';

// ─── ConfirmationScreen ───────────────────────────────────────────────────────

export default function ConfirmationScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { selectedRoute: route, draft, reset } = useBookingStore();

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
  const driverPhone = (route as any)?.driver?.phone;

  function handleWhatsApp() {
    if (!driverPhone) return;
    const message = encodeURIComponent(`Hi, I just booked ${ref}`);
    Linking.openURL(`whatsapp://send?phone=${driverPhone}&text=${message}`);
  }

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
        {route && (
          <View style={s.summaryCard}>
            <Row label="Route" value={`${route.origin_city} → ${route.destination_city}`} />
            <Row label="Departure" value={formatDateShort(route.departure_date)} />
            {draft.packageWeightKg > 0 && (
              <Row label="Weight" value={`${draft.packageWeightKg} kg`} />
            )}
            {draft.recipientName ? (
              <Row label="Recipient" value={draft.recipientName} />
            ) : null}
            {draft.paymentType ? (
              <Row label="Payment" value={paymentLabel(draft.paymentType)} />
            ) : null}
          </View>
        )}

        {/* ── WhatsApp button ───────────────────────────────── */}
        {driverPhone && (
          <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
            <Text style={s.whatsappBtnText}>💬  Message driver on WhatsApp</Text>
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
    </SafeAreaView>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function paymentLabel(type: string): string {
  const map: Record<string, string> = {
    cash_on_collection: 'Cash on collection',
    cash_on_delivery:   'Cash on delivery',
    credit_debit_card:  'Card',
    paypal:             'PayPal',
  };
  return map[type] ?? type;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
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
  rowValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, textAlign: 'right', flex: 1, marginLeft: Spacing.sm },

  whatsappBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  whatsappBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

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
