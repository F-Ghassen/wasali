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
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, isSameDay } from 'date-fns';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useSearchStore } from '@/stores/searchStore';
import { EU_ORIGIN_CITIES, TN_DESTINATION_CITIES, type City } from '@/constants/cities';


// ─── City groups ─────────────────────────────────────────────────────────────

type CitySection = { country: string; flag: string; data: City[]; comingSoon?: boolean };

const CITY_SECTIONS: CitySection[] = [
  {
    country: 'Germany',
    flag: '🇩🇪',
    data: EU_ORIGIN_CITIES.filter((c) => c.countryCode === 'DE'),
  },
  {
    country: 'Tunisia',
    flag: '🇹🇳',
    data: TN_DESTINATION_CITIES,
  },
  { country: 'France', flag: '🇫🇷', data: [], comingSoon: true },
  { country: 'Italy', flag: '🇮🇹', data: [], comingSoon: true },
];

// ─── City Picker ──────────────────────────────────────────────────────────────

function CityPicker({
  visible,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  onSelect: (city: City) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const sections: CitySection[] = CITY_SECTIONS.map((s) => ({
    ...s,
    data: query
      ? s.data.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      : s.data,
  }));

  const handleSelect = (city: City) => {
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
          renderItem={({ item, section }) =>
            section.comingSoon ? null : (
              <TouchableOpacity style={pickerS.item} onPress={() => handleSelect(item)} activeOpacity={0.7}>
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

function chunkWeeks(dates: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7));
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
  onSelect: (d: Date | null) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const weeks = chunkWeeks(Array.from({ length: 42 }, (_, i) => addDays(today, i)));

  const handleSelect = (d: Date | null) => {
    onSelect(d);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dateS.root}>
        <View style={dateS.header}>
          <Text style={dateS.title}>Depart before</Text>
          <TouchableOpacity onPress={onClose} style={dateS.closeBtn}>
            <Text style={dateS.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={dateS.anyTime} onPress={() => handleSelect(null)} activeOpacity={0.7}>
          <Text style={dateS.anyTimeText}>Any time</Text>
          {!selected && <Text style={dateS.anyTimeTick}>✓</Text>}
        </TouchableOpacity>

        <ScrollView contentContainerStyle={dateS.grid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={dateS.week}>
              {week.map((d) => {
                const isSelected = !!selected && isSameDay(d, selected);
                const isToday = isSameDay(d, today);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[dateS.cell, isSelected && dateS.cellSelected]}
                    onPress={() => handleSelect(d)}
                    activeOpacity={0.75}
                  >
                    <Text style={[dateS.cellDay, isSelected && dateS.cellTextSelected]}>
                      {isToday ? 'TDY' : format(d, 'EEE')}
                    </Text>
                    <Text style={[dateS.cellNum, isSelected && dateS.cellTextSelected]}>
                      {format(d, 'd')}
                    </Text>
                    <Text style={[dateS.cellMonth, isSelected && dateS.cellTextSelected]}>
                      {format(d, 'MMM')}
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

// ─── Featured Route Banner ────────────────────────────────────────────────────

const FEATURED = {
  driverName: 'Mohamed K.',
  rating: 4.9,
  reviewCount: 47,
  from: 'Berlin',
  to: 'Tunis',
  departureDate: new Date('2026-03-25'),
  collectionDeadline: new Date('2026-03-22'),
  capacityLeft: 12,
  totalCapacity: 30,
  pricePerKg: 3.5,
  isFull: false,
};

function RouteBanner({ onBook, onSeeAll }: { onBook: () => void; onSeeAll: () => void }) {
  const slideY = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 8, delay: 250 }),
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true, delay: 250 }),
    ]).start();
  }, []);

  const r = FEATURED;
  const fillPct = ((r.totalCapacity - r.capacityLeft) / r.totalCapacity) * 100;

  return (
    <Animated.View style={[bannerS.card, { transform: [{ translateY: slideY }], opacity }]}>
      {/* Route + price */}
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

      {/* Driver + capacity */}
      <View style={bannerS.driverRow}>
        <View style={bannerS.avatar}>
          <Text style={bannerS.avatarLetter}>{r.driverName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={bannerS.driverName}>{r.driverName}</Text>
          <Text style={bannerS.driverMeta}>⭐ {r.rating} · {r.reviewCount} reviews</Text>
        </View>
        <View style={bannerS.capacity}>
          <Text style={bannerS.capacityLabel}>{r.capacityLeft} kg left</Text>
          <View style={bannerS.bar}>
            <View style={[bannerS.barFill, { width: `${fillPct}%` as any }]} />
          </View>
        </View>
      </View>

      {/* Shared-by line */}
      <Text style={bannerS.expiry}>
        Shared by {r.driverName} · Collect by {format(r.collectionDeadline, 'MMM d')}
      </Text>

      {/* CTAs */}
      {r.isFull ? (
        <View style={bannerS.fullBox}>
          <Text style={bannerS.fullText}>This route is full — search for alternatives</Text>
        </View>
      ) : (
        <View style={bannerS.ctaWrap}>
          <TouchableOpacity style={bannerS.primaryBtn} onPress={onBook} activeOpacity={0.85}>
            <Text style={bannerS.primaryBtnText}>📦  Book this slot →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={bannerS.secondaryBtn} onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={bannerS.secondaryBtnText}>See all routes</Text>
          </TouchableOpacity>
        </View>
      )}
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

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { fromCity, fromCountry, toCity, toCountry, setFromCity, setToCity, setDate, isSearching } =
    useSearchStore();

  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const canSearch = !!fromCity && !!toCity;

  const handleSearch = () => {
    if (!canSearch) return;
    setDate(selectedDate ? selectedDate.toISOString() : null);
    router.push('/routes/results');
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ────────────────────────────────────────────── */}
        <SafeAreaView style={s.heroSafe}>
          <View style={s.hero}>
            <Text style={s.heroHeading}>
              Ship it.{' '}
              <Text style={s.heroAccent}>Trust it.</Text>
              {'\n'}Done.
            </Text>

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
              {fromCity ? (
                <>
                  <Text style={s.fieldCity}>{fromCity}</Text>
                  <Text style={s.fieldCountry}>{fromCountry}</Text>
                </>
              ) : (
                <Text style={s.fieldPlaceholder}>Select city</Text>
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
              {toCity ? (
                <>
                  <Text style={s.fieldCity}>{toCity}</Text>
                  <Text style={s.fieldCountry}>{toCountry}</Text>
                </>
              ) : (
                <Text style={s.fieldPlaceholder}>Select city</Text>
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
              {selectedDate ? (
                <Text style={s.fieldCity}>{format(selectedDate, 'EEE, MMM d')}</Text>
              ) : (
                <Text style={s.fieldPlaceholder}>Depart before…</Text>
              )}
            </View>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[s.searchBtn, (!canSearch || isSearching) && s.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!canSearch || isSearching}
            activeOpacity={0.85}
          >
            <Text style={s.searchBtnText}>
              {isSearching ? 'Searching…' : 'Search drivers →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Featured Route ──────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>FEATURED ROUTE</Text>
          <RouteBanner
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
        title="From — Select City"
        onSelect={(c) => setFromCity(c.name, c.country)}
        onClose={() => setShowFrom(false)}
      />
      <CityPicker
        visible={showTo}
        title="To — Select City"
        onSelect={(c) => setToCity(c.name, c.country)}
        onClose={() => setShowTo(false)}
      />
      <DatePickerModal
        visible={showDate}
        selected={selectedDate}
        onSelect={setSelectedDate}
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
  heroAccent: { fontWeight: '900' },
  statsBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statsText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  statsDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.text.tertiary },

  // Search card — floats over the hero
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
    marginBottom: Spacing.md,
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
  anyTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
  },
  anyTimeText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.secondary },
  anyTimeTick: { fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '700' },
  grid: { padding: Spacing.base, gap: Spacing.xs },
  week: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellDay: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cellNum: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text.primary,
    marginVertical: 1,
  },
  cellMonth: { fontSize: 9, color: Colors.text.tertiary },
  cellTextSelected: { color: Colors.white },
});

const bannerS = StyleSheet.create({
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
  capacity: { alignItems: 'flex-end' },
  capacityLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4 },
  bar: {
    width: 64,
    height: 4,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Colors.text.primary, borderRadius: 2 },
  expiry: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: Spacing.base },
  ctaWrap: { gap: Spacing.sm },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  secondaryBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
});
