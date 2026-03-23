import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SendHorizonal, Zap, ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import OriginCountryPicker from '@/components/OriginCountryPicker';
import FeaturedRoutes from '@/app/route-discovery/components/FeaturedRoutes';

// ─── Ship Docs Fast promo banner ──────────────────────────────────────────────

const P2P_BULLETS = [
  { icon: '⚡', text: 'Docs delivered in 1–3 days' },
  { icon: '🏆', text: 'Earn points & climb the board' },
  { icon: '🤝', text: 'Trusted expat community' },
];

function ShipDocsBanner({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={promo.card} onPress={onPress} activeOpacity={0.88}>
      <View style={promo.labelRow}>
        <View style={promo.labelPill}>
          <Zap size={10} color={Colors.gold} strokeWidth={2.5} />
          <Text style={promo.labelText}>NEW FEATURE</Text>
        </View>
      </View>

      <View style={promo.headRow}>
        <SendHorizonal size={26} color={Colors.white} strokeWidth={2} />
        <Text style={promo.headline}>Ship Docs Fast</Text>
      </View>
      <Text style={promo.sub}>
        Send or carry documents between Europe and Tunisia — for free or a small fee.
      </Text>

      <View style={promo.bullets}>
        {P2P_BULLETS.map((b) => (
          <View key={b.text} style={promo.bulletRow}>
            <Text style={promo.bulletIcon}>{b.icon}</Text>
            <Text style={promo.bulletText}>{b.text}</Text>
          </View>
        ))}
      </View>

      <View style={promo.cta}>
        <Text style={promo.ctaText}>Get started</Text>
        <ArrowRight size={15} color={Colors.gold} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Trust Band ───────────────────────────────────────────────────────────────

const TRUST = [
  { icon: '✓', text: 'Verified drivers only' },
  { icon: '🔒', text: 'Payment held in escrow' },
  { icon: '📍', text: 'Live status updates' },
  { icon: '⭐', text: 'Community reviews' },
];

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero with Search ────────────────────────────────── */}
        <SafeAreaView style={s.heroSafe}>
          <Hero />
        </SafeAreaView>

        {/* ── How It Works ────────────────────────────────────── */}
        <HowItWorks />

        {/* ── Featured routes by origin country ──────────────── */}
        <OriginCountryPicker />

        {/* ── Ship Docs Fast promo ────────────────────────────── */}
        <View style={s.section}>
          <ShipDocsBanner onPress={() => router.push('/p2p' as any)} />
        </View>

        {/* ── Featured Routes ─────────────────────────────────── */}
        <View style={s.section}>
          <FeaturedRoutes />
        </View>

        {/* ── Trust Band ──────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.trustBand}
        >
          {TRUST.map((item, i) => (
            <View key={i} style={s.trustPill}>
              <Text style={s.trustIcon}>{item.icon}</Text>
              <Text style={s.trustText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { flexGrow: 1 },
  heroSafe: { backgroundColor: Colors.background.primary },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  trustBand: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  trustIcon: { fontSize: 12 },
  trustText: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.text.secondary },
});

const promo = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  labelRow: { flexDirection: 'row' },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,162,39,0.18)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  labelText: { fontSize: 10, fontWeight: '800', color: Colors.gold, letterSpacing: 0.8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headline: { fontSize: FontSize['2xl'], fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  sub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
  bullets: { gap: Spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bulletIcon: { fontSize: 13 },
  bulletText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.88)', fontWeight: '500' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  ctaText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gold },
});
