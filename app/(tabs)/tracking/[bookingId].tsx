import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Lock, MapPin, Package, Printer, Truck, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackingStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'rated';

const STATUS_ORDER: TrackingStatus[] = ['confirmed', 'in_transit', 'delivered', 'rated'];

interface StepContext {
  destinationCity: string;
  weightKg: number;
  amountEur: number;
  confirmedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
}

interface StepData {
  key: TrackingStatus;
  label: string;
  icon: React.ReactNode;
  subtitle: (ctx: StepContext) => string;
}

// STEPS are built inside the component so they can use t()
// kept here as a reference for keys only
const STEP_KEYS: TrackingStatus[] = ['confirmed', 'in_transit', 'delivered', 'rated'];

function stepStatus(
  stepKey: TrackingStatus,
  currentStatus: TrackingStatus,
): 'done' | 'current' | 'pending' {
  const stepIdx    = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentStatus === 'pending') return 'pending';
  if (stepIdx < currentIdx)  return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TrackingStatus, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  in_transit: 'In transit',
  delivered:  'Delivered',
  rated:      'Completed',
};

const STATUS_COLORS: Record<TrackingStatus, { bg: string; text: string }> = {
  pending:    { bg: Colors.warningLight,  text: Colors.warning },
  confirmed:  { bg: Colors.secondary,     text: Colors.white },
  in_transit: { bg: Colors.successLight,  text: Colors.success },
  delivered:  { bg: Colors.successLight,  text: Colors.success },
  rated:      { bg: Colors.primaryLight,  text: Colors.text.primary },
};

function StatusBadge({ status }: { status: TrackingStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[b.badge, { backgroundColor: color.bg }]}>
      <Text style={[b.badgeText, { color: color.text }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

// ─── TimelineStep ─────────────────────────────────────────────────────────────

function TimelineStep({
  step, status, isLast, ctx,
}: {
  step: StepData;
  status: 'done' | 'current' | 'pending';
  isLast: boolean;
  ctx: StepContext;
}) {
  const isDone    = status === 'done';
  const isCurrent = status === 'current';

  return (
    <View style={tl.row}>
      <View style={tl.dotCol}>
        <View style={[
          tl.dot,
          isDone    && tl.dotDone,
          isCurrent && tl.dotCurrent,
          !isDone && !isCurrent && tl.dotPending,
        ]}>
          {isDone ? (
            <Check size={12} color={Colors.white} strokeWidth={3} />
          ) : isCurrent ? (
            <View style={tl.dotCurrentInner} />
          ) : null}
        </View>
        {!isLast && <View style={[tl.line, isDone && tl.lineDone]} />}
      </View>

      <View style={tl.content}>
        <Text style={[
          tl.label,
          isDone    && tl.labelDone,
          isCurrent && tl.labelCurrent,
          !isDone && !isCurrent && tl.labelPending,
        ]}>
          {step.label}
        </Text>
        <Text style={[tl.subtitle, !isDone && !isCurrent && tl.subtitlePending]}>
          {step.subtitle(ctx)}
        </Text>
        {step.key === 'rated' && status !== 'done' && (
          <View style={tl.escrowNote}>
            <Lock size={11} color={Colors.text.tertiary} strokeWidth={2} />
            <Text style={tl.escrowText}>Coming soon for online payments</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── TrackingScreen ───────────────────────────────────────────────────────────

type BookingRow = {
  id: string;
  status: string;
  package_weight_kg: number | null;
  price_eur: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  updated_at: string | null;
  created_at: string | null;
  route: {
    origin_city: string;
    destination_city: string;
    departure_date: string | null;
    estimated_arrival_date: string | null;
    driver: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
  sender: { full_name: string | null; phone: string | null } | null;
};

export default function TrackingScreen() {
  const router        = useRouter();
  const { t }         = useTranslation();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { width }     = useWindowDimensions();
  const isWide        = width >= 768;

  const [booking, setBooking]       = useState<BookingRow | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [labelVisible, setLabelVisible] = useState(false);

  const STEPS: StepData[] = [
    {
      key: 'confirmed',
      label: t('tracking.steps.confirmed'),
      icon: <Check size={14} color={Colors.white} strokeWidth={3} />,
      subtitle: (ctx) =>
        ctx.confirmedAt ? `${ctx.confirmedAt} · Payment secured in escrow` : 'Payment secured in escrow',
    },
    {
      key: 'in_transit',
      label: t('tracking.steps.in_transit'),
      icon: <Truck size={14} color={Colors.white} strokeWidth={2.5} />,
      subtitle: (ctx) =>
        ctx.inTransitAt
          ? `${ctx.inTransitAt} · ${ctx.weightKg} kg · En route to ${ctx.destinationCity}`
          : `En route to ${ctx.destinationCity}`,
    },
    {
      key: 'delivered',
      label: t('tracking.steps.delivered'),
      icon: <MapPin size={14} color={Colors.white} strokeWidth={2.5} />,
      subtitle: (ctx) =>
        ctx.deliveredAt ? `${ctx.deliveredAt} · Confirmed by driver` : 'Pending',
    },
    {
      key: 'rated',
      label: t('tracking.steps.rated'),
      icon: <Lock size={14} color={Colors.white} strokeWidth={2.5} />,
      subtitle: (ctx) =>
        ctx.amountEur > 0
          ? `€${ctx.amountEur.toFixed(2)} released to driver`
          : 'Coming soon for online payments',
    },
  ];

  useEffect(() => {
    if (!bookingId) return;

    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, package_weight_kg, price_eur, recipient_name, recipient_phone,
          updated_at, created_at,
          route:routes!route_id(
            origin_city, destination_city, departure_date, estimated_arrival_date,
            driver:profiles!driver_id(full_name, avatar_url)
          ),
          sender:profiles!sender_id(full_name, phone)
        `)
        .eq('id', bookingId)
        .single();
      setBooking(data as unknown as BookingRow);
      setIsLoading(false);
    };
    load();

    const channel = supabase
      .channel(`tracking-${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, (payload) => {
        setBooking((prev) => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const currentStatus = booking.status as TrackingStatus;
  const route = booking.route;

  const ctx: StepContext = {
    destinationCity: route?.destination_city ?? 'destination',
    weightKg:        booking.package_weight_kg ?? 0,
    amountEur:       booking.price_eur ?? 0,
    confirmedAt:     currentStatus !== 'pending' && booking.updated_at
                       ? formatDate(booking.updated_at) : undefined,
    inTransitAt:     (currentStatus === 'in_transit' || currentStatus === 'delivered' || currentStatus === 'rated')
                       && booking.updated_at ? formatDate(booking.updated_at) : undefined,
    deliveredAt:     (currentStatus === 'delivered' || currentStatus === 'rated')
                       && booking.updated_at ? formatDate(booking.updated_at) : undefined,
  };

  const labelData: LabelData = {
    trackingId:           `WSL-${booking.id.slice(0, 6).toUpperCase()}`,
    originCity:           route?.origin_city ?? '',
    originFlag:           '🇩🇪',
    destCity:             route?.destination_city ?? '',
    destFlag:             '🇹🇳',
    departureDate:        route?.departure_date ? formatDate(route.departure_date) : '—',
    arrivalDate:          route?.estimated_arrival_date ? formatDate(route.estimated_arrival_date) : '—',
    driverName:           route?.driver?.full_name ?? '—',
    driverRating:         0,
    driverTrips:          0,
    senderName:           booking.sender?.full_name ?? '—',
    senderPhone:          booking.sender?.phone ?? '',
    recipientName:        booking.recipient_name ?? '—',
    recipientPhone:       booking.recipient_phone ?? '',
    recipientAddressLine1: '',
    recipientAddressLine2: '',
    weightKg:             booking.package_weight_kg ?? 0,
    deliveryMethod:       'Home delivery',
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('tracking.title')}</Text>
          {bookingId && (
            <Text style={s.headerId}>#{bookingId.slice(0, 8).toUpperCase()}</Text>
          )}
        </View>
        <StatusBadge status={currentStatus} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, isWide && s.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isWide ? s.wideLayout : undefined}>

          {/* ── Pending banner ───────────────────────────── */}
          {currentStatus === 'pending' && (
            <View style={s.pendingBanner}>
              <Package size={16} color={Colors.warning} strokeWidth={2} />
              <Text style={s.pendingBannerText}>
                {t('tracking.pendingBanner')}
              </Text>
            </View>
          )}

          {/* ── Booking summary card ─────────────────────── */}
          <View style={s.summaryCard}>
            <View style={s.summaryHeader}>
              <View style={s.routePill}>
                <Text style={s.routePillText}>
                  {route?.origin_city ?? 'Origin'} → {route?.destination_city ?? 'Destination'}
                </Text>
              </View>
              <Text style={s.totalAmount}>€{ctx.amountEur.toFixed(2)}</Text>
            </View>

            <View style={s.summaryRows}>
              <SummaryRow label={t('tracking.departure')}    value={route?.departure_date ? formatDate(route.departure_date) : '—'} />
              <SummaryRow label={t('tracking.estArrival')} value={route?.estimated_arrival_date ? formatDate(route.estimated_arrival_date) : '—'} />
              <SummaryRow label={t('tracking.weight')}       value={`${ctx.weightKg} kg`} />
            </View>

            <View style={s.escrowBanner}>
              <Lock size={13} color={Colors.success} strokeWidth={2} />
              <Text style={s.escrowBannerText}>
                {t('tracking.escrowNote')}
              </Text>
            </View>
          </View>

          {/* ── Timeline ─────────────────────────────────── */}
          {currentStatus !== 'pending' && (
            <View style={s.timelineCard}>
              <Text style={s.timelineTitle}>{t('tracking.shipmentProgress')}</Text>
              <View style={s.timeline}>
                {STEPS.map((step, i) => (
                  <TimelineStep
                    key={step.key}
                    step={step}
                    status={stepStatus(step.key, currentStatus)}
                    isLast={i === STEPS.length - 1}
                    ctx={ctx}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Rate driver ──────────────────────────────── */}
          {currentStatus === 'delivered' && (
            <View style={s.actionCard}>
              <Text style={s.actionTitle}>{t('tracking.rateTitle')}</Text>
              <TouchableOpacity
                style={s.actionBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/post-delivery/rate/${bookingId}` as never)}
              >
                <Star size={16} color={Colors.white} strokeWidth={2} />
                <Text style={s.actionBtnText}>{t('tracking.rateBtn')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Label ────────────────────────────────────── */}
          <TouchableOpacity
            style={s.labelBtn}
            activeOpacity={0.85}
            onPress={() => setLabelVisible(true)}
          >
            <Printer size={16} color={Colors.text.primary} strokeWidth={2} />
            <Text style={s.labelBtnText}>{t('tracking.printLabel')}</Text>
          </TouchableOpacity>

          {/* ── My bookings ──────────────────────────────── */}
          <TouchableOpacity
            style={s.homeBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)/bookings' as never)}
          >
            <Text style={s.homeBtnText}>{t('tracking.myBookings')}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <ShipmentLabelModal
        visible={labelVisible}
        onClose={() => setLabelVisible(false)}
        data={labelData}
      />
    </SafeAreaView>
  );
}

// ─── SummaryRow ───────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryRowLabel}>{label}</Text>
      <Text style={s.summaryRowValue}>{value}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  backBtn:      { padding: Spacing.xs },
  backText:     { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerId:     { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  scroll:     { padding: Spacing.base, gap: Spacing.md },
  scrollWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  wideLayout: { gap: Spacing.md },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  pendingBannerText: { flex: 1, fontSize: FontSize.sm, color: Colors.warning, fontWeight: '500', lineHeight: 18 },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routePill: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  routePillText:   { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  totalAmount:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  summaryRows:     { gap: 6 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  summaryRowValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
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

  timelineCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  timeline: { gap: 0 },

  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionTitle:   { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },

  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  labelBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },

  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
  },
  homeBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
});

const b = StyleSheet.create({
  badge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
});

const tl = StyleSheet.create({
  row:    { flexDirection: 'row', gap: Spacing.md },
  dotCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.secondary,
  },
  dotDone:    { backgroundColor: Colors.success,              borderColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.white,                borderColor: Colors.success, borderWidth: 2.5 },
  dotCurrentInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  dotPending: { backgroundColor: Colors.background.tertiary,  borderColor: Colors.border.light },
  line:     { flex: 1, width: 2, minHeight: 32, backgroundColor: Colors.border.light, marginVertical: 2 },
  lineDone: { backgroundColor: Colors.success },
  content:  { flex: 1, paddingBottom: Spacing.lg, gap: 3 },
  label:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  labelDone:    { color: Colors.text.primary },
  labelCurrent: { color: Colors.success },
  labelPending: { color: Colors.text.tertiary, fontWeight: '500' },
  subtitle:        { fontSize: FontSize.sm, color: Colors.text.secondary },
  subtitlePending: { color: Colors.text.tertiary },
  escrowNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  escrowText: { fontSize: 11, color: Colors.text.tertiary },
});
