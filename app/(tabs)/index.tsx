import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SectionList,
  TextInput,
  SafeAreaView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { SendHorizonal, Zap, ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import WhereAreYouFrom from '@/components/WhereAreYouFrom';

// ─── Featured Routes ──────────────────────────────────────────────────────────

type FeaturedRoute = {
  id: string;
  driverName: string;
  from: string;
  to: string;
  departureDate: Date;
  capacityLeft: number;
  pricePerKg: number;
  isFull: boolean;
};

function FeaturedRouteCard({ route: r, onBook }: { route: FeaturedRoute; onBook: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={bannerS.card}>
      <View style={bannerS.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={bannerS.route}>{r.from} → {r.to}</Text>
          <Text style={bannerS.departure}>Departs {format(r.departureDate, 'EEE, MMM d')}</Text>
        </View>
        <View style={bannerS.pricePill}>
          <Text style={bannerS.price}>€{r.pricePerKg}</Text>
          <Text style={bannerS.perKg}>/kg</Text>
        </View>
      </View>

      <View style={bannerS.driverRow}>
        <View style={bannerS.avatar}>
          <Text style={bannerS.avatarLetter}>{r.driverName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={bannerS.driverName}>{r.driverName}</Text>
          <Text style={bannerS.driverMeta}>{r.capacityLeft} kg available</Text>
        </View>
      </View>

      {r.isFull ? (
        <View style={bannerS.fullBox}>
          <Text style={bannerS.fullText}>{t('home.routeFull')}</Text>
        </View>
      ) : (
        <TouchableOpacity style={bannerS.primaryBtn} onPress={onBook} activeOpacity={0.85}>
          <Text style={bannerS.primaryBtnText}>{t('home.bookSlot')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FeaturedRoutesSection({ routes, onBook, onSeeAll }: {
  routes: FeaturedRoute[];
  onBook: () => void;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const slideY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 8, delay: 300 }),
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true, delay: 300 }),
    ]).start();
  }, []);

  const cols = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  const GAP = Spacing.md;
  const cardWidth = (width - Spacing.base * 2 - GAP * (cols - 1)) / cols;
  const visible = routes.slice(0, cols * 2);

  if (routes.length === 0) return null;

  return (
    <Animated.View style={[bannerS.section, { transform: [{ translateY: slideY }], opacity }]}>
      <Text style={s.sectionLabel}>{t('home.featuredRoutes')}</Text>

      <View style={[bannerS.grid, { gap: GAP }]}>
        {visible.map((route) => (
          <View key={route.id} style={{ width: cardWidth }}>
            <FeaturedRouteCard route={route} onBook={onBook} />
          </View>
        ))}
      </View>

      <TouchableOpacity style={bannerS.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
        <Text style={bannerS.seeAllBtnText}>{t('home.showAllRoutes')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Trust Band ───────────────────────────────────────────────────────────────

const TRUST = [
  { icon: '✓', text: 'Verified drivers only' },
  { icon: '🔒', text: 'Payment held in escrow' },
  { icon: '📍', text: 'Live status updates' },
  { icon: '⭐', text: 'Community reviews' },
];

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

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [featuredRoutes, setFeaturedRoutes] = useState<FeaturedRoute[]>([]);

  useEffect(() => {
    const fetchFeaturedRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select(`
            id,
            origin_city,
            destination_city,
            departure_date,
            available_weight_kg,
            min_weight_kg,
            price_per_kg_eur,
            status,
            promotion_active,
            promotion_percentage,
            driver:profiles!driver_id(id, full_name, rating, avatar_url)
          `)
          .eq('status', 'active')
          .gte('available_weight_kg', 1)
          .order('departure_date', { ascending: true })
          .limit(6);

        if (error) {
          console.error('Error fetching featured routes:', error);
          return;
        }

        if (!data) return;

        setFeaturedRoutes(
          data.map((r: any) => ({
            id: r.id,
            driverName: r.driver?.full_name ?? 'Driver',
            from: r.origin_city,
            to: r.destination_city,
            departureDate: new Date(r.departure_date),
            capacityLeft: r.available_weight_kg,
            pricePerKg: r.price_per_kg_eur,
            isFull: r.available_weight_kg <= 0,
          })),
        );
      } catch (err) {
        console.error('Failed to fetch featured routes:', err);
      }
    };

    fetchFeaturedRoutes();
  }, []);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero with Search ────────────────────────────────── */}
        <SafeAreaView style={s.heroSafe}>
          <Hero />
        </SafeAreaView>

        {/* ── How It Works ────────────────────────────────────── */}
        <HowItWorks />

        {/* ── Where are you flying from ──────────────────────── */}
        <WhereAreYouFrom />

        {/* ── Ship Docs Fast promo ────────────────────────────── */}
        <View style={s.section}>
          <ShipDocsBanner onPress={() => router.push('/p2p' as any)} />
        </View>

        {/* ── Featured Routes ─────────────────────────────────── */}
        <View style={s.section}>
          <FeaturedRoutesSection
            routes={featuredRoutes}
            onBook={() => router.push('/routes/results')}
            onSeeAll={() => router.push('/routes/results')}
          />
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.text.tertiary,
  },

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

const bannerS = StyleSheet.create({
  section: { gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  route: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  departure: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  price: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  perKg: { fontSize: FontSize.xs, color: Colors.text.secondary, marginLeft: 2 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary },
  driverName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  driverMeta: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  seeAllBtn: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  seeAllBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
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
