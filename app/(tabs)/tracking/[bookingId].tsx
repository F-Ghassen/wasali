import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Lock, MapPin, Package, Printer, Truck, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useBookingStore } from '@/stores/bookingStore';
import { ShipmentLabelModal, type LabelData } from '@/components/tracking/ShipmentLabelModal';

// ─── Status lifecycle ─────────────────────────────────────────────────────────

type TrackingStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'collected'
  | 'in_transit'
  | 'delivered'
  | 'rated';

const STATUS_ORDER: TrackingStatus[] = [
  'confirmed', 'collected', 'in_transit', 'delivered', 'rated',
];

interface StepData {
  key: TrackingStatus;
  label: string;
  icon: React.ReactNode;
  subtitle: (ctx: StepContext) => string;
}

interface StepContext {
  destinationCity: string;
  weightKg: number;
  amountEur: number;
  confirmedAt?: string;
  collectedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
}

const STEPS: StepData[] = [
  {
    key: 'confirmed',
    label: 'Booking confirmed',
    icon: <Check size={14} color={Colors.white} strokeWidth={3} />,
    subtitle: (ctx) =>
      ctx.confirmedAt
        ? `${ctx.confirmedAt} · Payment secured in escrow`
        : 'Payment secured in escrow',
  },
  {
    key: 'collected',
    label: 'Package collected',
    icon: <Package size={14} color={Colors.white} strokeWidth={2.5} />,
    subtitle: (ctx) =>
      ctx.collectedAt
        ? `${ctx.collectedAt} · Confirmed by driver · ${ctx.weightKg} kg`
        : 'Pending',
  },
  {
    key: 'in_transit',
    label: 'In transit',
    icon: <Truck size={14} color={Colors.white} strokeWidth={2.5} />,
    subtitle: (ctx) =>
      ctx.inTransitAt
        ? `${ctx.inTransitAt} · En route to ${ctx.destinationCity}`
        : `En route to ${ctx.destinationCity}`,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: <MapPin size={14} color={Colors.white} strokeWidth={2.5} />,
    subtitle: (ctx) =>
      ctx.deliveredAt
        ? `${ctx.deliveredAt} · Confirmed by driver`
        : 'Pending',
  },
  {
    key: 'rated',
    label: 'Escrow released',
    icon: <Lock size={14} color={Colors.white} strokeWidth={2.5} />,
    subtitle: (ctx) =>
      ctx.amountEur > 0
        ? `€${ctx.amountEur.toFixed(2)} released to driver`
        : 'Coming soon for online payments',
  },
];

function stepStatus(
  stepKey: TrackingStatus,
  currentStatus: TrackingStatus,
): 'done' | 'current' | 'pending' {
  const stepIdx    = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (stepIdx < currentIdx)  return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TrackingStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  confirmed:   'Confirmed',
  collected:   'Collected',
  in_transit:  'In transit',
  delivered:   'Delivered',
  rated:       'Completed',
};

const STATUS_COLORS: Record<TrackingStatus, { bg: string; text: string }> = {
  awaiting_payment: { bg: Colors.warningLight,  text: Colors.warning },
  confirmed:        { bg: Colors.secondaryLight, text: Colors.secondary },
  collected:        { bg: Colors.successLight,   text: Colors.success },
  in_transit:       { bg: Colors.successLight,   text: Colors.success },
  delivered:        { bg: Colors.successLight,   text: Colors.success },
  rated:            { bg: Colors.primaryLight,   text: Colors.text.primary },
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
      {/* Dot + connecting line */}
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
        {!isLast && (
          <View style={[tl.line, isDone && tl.lineDone]} />
        )}
      </View>

      {/* Content */}
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
        {/* Escrow "coming soon" note */}
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

// Mock data — replace with real Supabase fetch once DB is live
const MOCK_STATUS: TrackingStatus = 'confirmed';
const MOCK_CONTEXT: StepContext = {
  destinationCity: 'Tunis',
  weightKg: 7,
  amountEur: 41.50,
  confirmedAt: 'Mar 7',
};

const MOCK_LABEL: LabelData = {
  trackingId: 'WSL-20483',
  originCity: 'Berlin',
  originFlag: '🇩🇪',
  destCity: 'Tunis',
  destFlag: '🇹🇳',
  departureDate: 'Mar 10',
  arrivalDate: 'Mar 16',
  driverName: 'Khalil H.',
  driverRating: 4.9,
  driverTrips: 63,
  senderName: 'Amira Bensalem',
  senderPhone: '+49 176 4821 0033',
  recipientName: 'Mohamed Bensalem',
  recipientPhone: '+216 98 123 456',
  recipientAddressLine1: '12 Rue de la République',
  recipientAddressLine2: 'Tunis 1001',
  weightKg: 7,
  deliveryMethod: 'Home delivery',
};

export default function TrackingScreen() {
  const router             = useRouter();
  const { bookingId }      = useLocalSearchParams<{ bookingId: string }>();
  const { selectedRoute }  = useBookingStore();
  const { width }          = useWindowDimensions();
  const isWide             = width >= 768;

  const [labelVisible, setLabelVisible] = useState(false);

  // In production: fetch booking + status from Supabase by bookingId
  const currentStatus = MOCK_STATUS;
  const ctx           = MOCK_CONTEXT;

  const route = selectedRoute;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Shipment tracking</Text>
          {bookingId && bookingId !== 'mock' && (
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

          {/* ── Booking summary card ─────────────────────── */}
          <View style={s.summaryCard}>
            <View style={s.summaryHeader}>
              <View style={s.routePill}>
                <Text style={s.routePillText}>
                  {route?.origin_city ?? 'Origin'} → {route?.destination_city ?? 'Destination'}
                </Text>
              </View>
              <Text style={s.totalAmount}>
                €{ctx.amountEur.toFixed(2)}
              </Text>
            </View>

            <View style={s.summaryRows}>
              <SummaryRow label="Departure"    value={route?.departure_date ? formatDate(route.departure_date) : '—'} />
              <SummaryRow label="Est. arrival" value={route?.estimated_arrival_date ? formatDate(route.estimated_arrival_date) : '—'} />
              <SummaryRow label="Weight"       value={`${ctx.weightKg} kg`} />
            </View>

            <View style={s.escrowBanner}>
              <Lock size={13} color={Colors.success} strokeWidth={2} />
              <Text style={s.escrowBannerText}>
                Payment held in escrow — released only on confirmed delivery
              </Text>
            </View>
          </View>

          {/* ── Timeline ─────────────────────────────────── */}
          <View style={s.timelineCard}>
            <Text style={s.timelineTitle}>Shipment progress</Text>
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

          {/* ── Actions ──────────────────────────────────── */}
          {currentStatus === 'delivered' && (
            <View style={s.actionCard}>
              <Text style={s.actionTitle}>Everything arrived safely?</Text>
              <TouchableOpacity style={s.actionBtn} activeOpacity={0.85}>
                <Star size={16} color={Colors.white} strokeWidth={2} />
                <Text style={s.actionBtnText}>Rate your driver</Text>
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
            <Text style={s.labelBtnText}>Print shipment label</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <ShipmentLabelModal
        visible={labelVisible}
        onClose={() => setLabelVisible(false)}
        data={MOCK_LABEL}
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
  root: { flex: 1, backgroundColor: Colors.background.secondary },

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
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerId:    { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  scroll:     { padding: Spacing.base, gap: Spacing.md },
  scrollWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  wideLayout: { gap: Spacing.md },

  // Summary card
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
  routePillText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  totalAmount:   { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  summaryRows:   { gap: 6 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between' },
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

  // Timeline card
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

  // Action card
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
  actionTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
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

  // Label button
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
  labelBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});

// Status badge
const b = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
});

// Timeline
const tl = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dotCol: {
    alignItems: 'center',
    width: 28,
  },
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
  dotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotCurrent: {
    backgroundColor: Colors.white,
    borderColor: Colors.success,
    borderWidth: 2.5,
  },
  dotCurrentInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  dotPending: {
    backgroundColor: Colors.background.tertiary,
    borderColor: Colors.border.light,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 32,
    backgroundColor: Colors.border.light,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: 3,
  },
  label:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  labelDone:    { color: Colors.text.primary },
  labelCurrent: { color: Colors.success },
  labelPending: { color: Colors.text.tertiary, fontWeight: '500' },
  subtitle:        { fontSize: FontSize.sm, color: Colors.text.secondary },
  subtitlePending: { color: Colors.text.tertiary },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  escrowText: { fontSize: 11, color: Colors.text.tertiary },
});
