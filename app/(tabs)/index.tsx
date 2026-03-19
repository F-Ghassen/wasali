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
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, addDays, isBefore, subMonths, addMonths, isToday, isSameDay,
} from 'date-fns';
import { SendHorizonal, Zap, ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useSearchStore } from '@/stores/searchStore';
import { useCities, type CityRow } from '@/hooks/useCities';
import { supabase } from '@/lib/supabase';

// ─── City Picker ──────────────────────────────────────────────────────────────

type CitySection = {
  country: string;
  flag: string;
  data: CityRow[];
  comingSoon?: boolean;
};

function CityPicker({
  visible,
  title,
  citiesByCountry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  citiesByCountry: Record<string, CityRow[]>;
  onSelect: (city: CityRow) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const sections: CitySection[] = Object.entries(citiesByCountry).map(
    ([country, cities]) => ({
      country,
      flag: cities[0]?.flag_emoji ?? '',
      data: query
        ? cities.filter((c) =>
            c.name.toLowerCase().includes(query.toLowerCase()),
          )
        : cities,
      comingSoon: cities.every((c) => c.coming_soon),
    }),
  );

  const handleSelect = (city: CityRow) => {
    if (city.coming_soon) return;
    onSelect(city);
    onClose();
    setQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={pickerS.root}>
        <View style={pickerS.header}>
          <Text style={pickerS.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={pickerS.closeBtn}>
            <Text style={pickerS.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={pickerS.searchWrap}>
          <TextInput
            style={pickerS.search}
            placeholder="Search city…"
            placeholderTextColor={Colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={pickerS.sectionHeader}>
              <Text style={pickerS.sectionFlag}>{section.flag}</Text>
              <Text style={pickerS.sectionName}>{section.country}</Text>
              {section.comingSoon && (
                <View style={pickerS.badge}>
                  <Text style={pickerS.badgeText}>Coming soon</Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item }) =>
            item.coming_soon ? null : (
              <TouchableOpacity
                style={pickerS.item}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={pickerS.cityName}>{item.name}</Text>
                <Text style={pickerS.chevron}>›</Text>
              </TouchableOpacity>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Date Picker ──────────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarWeeks(month: Date): (Date | null)[][] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: (Date | null)[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isSameMonth(day, month) ? new Date(day) : null);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function DatePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(today));

  const weeks = buildCalendarWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dateS.root}>
        <View style={dateS.header}>
          <Text style={dateS.title}>{t('home.departBeforeTitle')}</Text>
          <TouchableOpacity onPress={onClose} style={dateS.closeBtn}>
            <Text style={dateS.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={dateS.monthNav}>
          <TouchableOpacity
            style={[dateS.navBtn, !canGoPrev && dateS.navBtnDisabled]}
            onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={[dateS.navArrow, !canGoPrev && dateS.navArrowDisabled]}>‹</Text>
          </TouchableOpacity>

          <Text style={dateS.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>

          <TouchableOpacity
            style={dateS.navBtn}
            onPress={() => setViewMonth((m) => addMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={dateS.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={dateS.dowRow}>
          {DOW_LABELS.map((d) => (
            <Text key={d} style={dateS.dowLabel}>{d}</Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={dateS.grid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={dateS.week}>
              {week.map((d, di) => {
                if (!d) return <View key={di} style={dateS.cell} />;
                const isPast = isBefore(d, today) && !isToday(d);
                const isSelected = !!selected && isSameDay(d, selected);
                const todayCell = isToday(d);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      dateS.cell,
                      isSelected && dateS.cellSelected,
                      todayCell && !isSelected && dateS.cellToday,
                    ]}
                    onPress={() => { if (!isPast) { onSelect(d); onClose(); } }}
                    activeOpacity={isPast ? 1 : 0.75}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        dateS.cellNum,
                        isPast && dateS.cellNumPast,
                        isSelected && dateS.cellTextSelected,
                        todayCell && !isSelected && dateS.cellNumToday,
                      ]}
                    >
                      {format(d, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

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
  const {
    fromCityId, fromCityName, fromCountry,
    toCityId, toCityName, toCountry,
    departFromDate,
    setFromCity, setToCity, setDepartFromDate,
  } = useSearchStore();

  const { citiesByCountry } = useCities();

  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [featuredRoutes, setFeaturedRoutes] = useState<FeaturedRoute[]>([]);

  useEffect(() => {
    supabase
      .from('routes')
      .select('id, origin_city, destination_city, departure_date, available_weight_kg, price_per_kg_eur, status, driver:profiles!driver_id(full_name)')
      .eq('status', 'active')
      .order('departure_date', { ascending: true })
      .limit(6)
      .then(({ data }) => {
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
            isFull: r.status === 'full',
          })),
        );
      });
  }, []);

  const canSearch = !!fromCityId && !!toCityId;

  const handleSearch = () => {
    if (!canSearch) return;
    router.push({
      pathname: '/routes/results',
      params: {
        origin_city_id: fromCityId,
        destination_city_id: toCityId,
        depart_from_date: departFromDate,
      },
    } as any);
  };

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
    setDepartFromDate(format(d, 'yyyy-MM-dd'));
  };

  const dateLabel = selectedDate ? format(selectedDate, 'EEE, MMM d') : null;

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ────────────────────────────────────────────── */}
        <SafeAreaView style={s.heroSafe}>
          <View style={s.hero}>
            <Text style={s.heroHeading}>{t('home.heroTitle')}</Text>

            <View style={s.statsBand}>
              <Text style={s.statsText}>100+ Verified drivers</Text>
              <View style={s.statsDot} />
              <Text style={s.statsText}>4.8★</Text>
              <View style={s.statsDot} />
              <Text style={s.statsText}>3k+ Deliveries</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* ── Search Card ─────────────────────────────────────── */}
        <View style={s.card}>
          {/* From */}
          <TouchableOpacity style={s.field} onPress={() => setShowFrom(true)} activeOpacity={0.7}>
            <View style={s.fieldTag}>
              <Text style={s.fieldTagText}>FROM</Text>
            </View>
            <View style={s.fieldBody}>
              {fromCityName ? (
                <>
                  <Text style={s.fieldCity}>{fromCityName}</Text>
                  <Text style={s.fieldCountry}>{fromCountry}</Text>
                </>
              ) : (
                <Text style={s.fieldPlaceholder}>{t('home.selectCity')}</Text>
              )}
            </View>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          <View style={s.fieldDivider} />

          {/* To */}
          <TouchableOpacity style={s.field} onPress={() => setShowTo(true)} activeOpacity={0.7}>
            <View style={s.fieldTag}>
              <Text style={s.fieldTagText}>TO</Text>
            </View>
            <View style={s.fieldBody}>
              {toCityName ? (
                <>
                  <Text style={s.fieldCity}>{toCityName}</Text>
                  <Text style={s.fieldCountry}>{toCountry}</Text>
                </>
              ) : (
                <Text style={s.fieldPlaceholder}>{t('home.selectCity')}</Text>
              )}
            </View>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          <View style={s.fieldDivider} />

          {/* Date */}
          <TouchableOpacity style={s.field} onPress={() => setShowDate(true)} activeOpacity={0.7}>
            <View style={s.fieldTag}>
              <Text style={s.fieldTagText}>DATE</Text>
            </View>
            <View style={s.fieldBody}>
              {dateLabel ? (
                <Text style={s.fieldCity}>{dateLabel}</Text>
              ) : (
                <Text style={s.fieldPlaceholder}>{t('home.departBefore')}</Text>
              )}
            </View>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[s.searchBtn, !canSearch && s.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!canSearch}
            activeOpacity={0.85}
          >
            <Text style={s.searchBtnText}>{t('home.searchDrivers')}</Text>
          </TouchableOpacity>
        </View>

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

      {/* ── Modals ──────────────────────────────────────────────── */}
      <CityPicker
        visible={showFrom}
        title={t('home.fromSelectCity')}
        citiesByCountry={citiesByCountry}
        onSelect={(c) => setFromCity(c.id, c.name, c.country)}
        onClose={() => setShowFrom(false)}
      />
      <CityPicker
        visible={showTo}
        title={t('home.toSelectCity')}
        citiesByCountry={citiesByCountry}
        onSelect={(c) => setToCity(c.id, c.name, c.country)}
        onClose={() => setShowTo(false)}
      />
      <DatePickerModal
        visible={showDate}
        selected={selectedDate}
        onSelect={handleDateSelect}
        onClose={() => setShowDate(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { flexGrow: 1 },

  heroSafe: { backgroundColor: Colors.background.primary },
  hero: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'] + Spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  heroHeading: {
    fontSize: 40,
    fontWeight: '300',
    color: Colors.text.primary,
    lineHeight: 50,
    letterSpacing: -0.8,
  },
  statsBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statsText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  statsDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.text.tertiary },

  card: {
    marginHorizontal: Spacing.base,
    marginTop: -(Spacing.xl + Spacing.base),
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: Spacing.xl,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  fieldTag: {
    width: 48,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.text.secondary,
    letterSpacing: 0.8,
  },
  fieldBody: { flex: 1 },
  fieldCity: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  fieldCountry: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  fieldPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary },
  fieldChevron: { fontSize: 22, color: Colors.text.tertiary, lineHeight: 26 },
  fieldDivider: { height: 1, backgroundColor: Colors.border.light, marginHorizontal: Spacing.base },
  searchBtn: {
    margin: Spacing.base,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.3 },
  searchBtnText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

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

const pickerS = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  closeText: { fontSize: FontSize.lg, color: Colors.text.secondary },
  searchWrap: { padding: Spacing.base, paddingBottom: 0 },
  search: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  sectionFlag: { fontSize: 16 },
  sectionName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  cityName: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text.primary },
  chevron: { fontSize: 18, color: Colors.text.tertiary },
});

const dateS = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  closeText: { fontSize: FontSize.lg, color: Colors.text.secondary },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 22, color: Colors.text.primary, lineHeight: 26 },
  navArrowDisabled: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },

  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  grid: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl, gap: 4 },
  week: { flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellNum: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  cellNumPast: { color: Colors.text.tertiary },
  cellNumToday: { fontWeight: '800' },
  cellTextSelected: { color: Colors.white },
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
