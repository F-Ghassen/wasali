import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { RouteCard, type RouteCardRoute } from '@/components/route/RouteCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSearchStore } from '@/stores/searchStore';
import { useBookingStore } from '@/stores/bookingStore';

// ─── Mock data (swap with real Supabase query once DB is live) ─────────────────

const MOCK_ROUTES: RouteCardRoute[] = [
  {
    id: '1', driver_id: 'd1', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Berlin',    origin_country: 'Germany',
    destination_city: 'Tunis', destination_country: 'Tunisia',
    departure_date: '2026-03-25',
    estimated_arrival_date: '2026-03-29',
    available_weight_kg: 12, price_per_kg_eur: 3.50,
    total_weight_kg: 30, min_booking_kg: 5,
    discount_pct: 15, original_price_per_kg_eur: 4.10,
    driver_rating: 4.9, driver_trip_count: 47, driver_verified: true,
    forbidden_items: ['Liquids', 'Weapons', 'Perishables'],
    driver: { id: 'd1', full_name: 'Mohamed K.', avatar_url: null, phone: null, phone_verified: true, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [
      { id: 's1', route_id: '1', city: 'Hamburg',  country: 'Germany',  stop_order: 1, arrival_date: '2026-03-26', is_pickup_available: true,  is_dropoff_available: false },
      { id: 's2', route_id: '1', city: 'Sfax',     country: 'Tunisia',  stop_order: 2, arrival_date: '2026-03-30', is_pickup_available: false, is_dropoff_available: true  },
    ],
  },
  {
    id: '2', driver_id: 'd2', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Munich',    origin_country: 'Germany',
    destination_city: 'Tunis', destination_country: 'Tunisia',
    departure_date: '2026-03-28',
    estimated_arrival_date: '2026-04-01',
    available_weight_kg: 5, price_per_kg_eur: 4.00,
    total_weight_kg: 20, min_booking_kg: 3,
    driver_rating: 4.7, driver_trip_count: 23, driver_verified: true,
    forbidden_items: ['Food', 'Weapons'],
    driver: { id: 'd2', full_name: 'Amine B.', avatar_url: null, phone: null, phone_verified: true, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [
      { id: 's3', route_id: '2', city: 'Sousse', country: 'Tunisia', stop_order: 1, arrival_date: '2026-04-02', is_pickup_available: false, is_dropoff_available: true },
    ],
  },
  {
    id: '3', driver_id: 'd3', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Frankfurt',   origin_country: 'Germany',
    destination_city: 'Sousse', destination_country: 'Tunisia',
    departure_date: '2026-04-02',
    estimated_arrival_date: '2026-04-06',
    available_weight_kg: 22, price_per_kg_eur: 3.80,
    total_weight_kg: 25, min_booking_kg: 10,
    driver_rating: 4.8, driver_trip_count: 61, driver_verified: true,
    forbidden_items: ['Liquids', 'Fragile items', 'Weapons'],
    driver: { id: 'd3', full_name: 'Youssef T.', avatar_url: null, phone: null, phone_verified: true, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [
      { id: 's4', route_id: '3', city: 'Cologne', country: 'Germany', stop_order: 1, arrival_date: '2026-04-03', is_pickup_available: true,  is_dropoff_available: false },
      { id: 's5', route_id: '3', city: 'Sfax',    country: 'Tunisia', stop_order: 2, arrival_date: '2026-04-07', is_pickup_available: false, is_dropoff_available: true  },
    ],
  },
  {
    id: '4', driver_id: 'd4', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Hamburg',   origin_country: 'Germany',
    destination_city: 'Tunis', destination_country: 'Tunisia',
    departure_date: '2026-04-05',
    estimated_arrival_date: '2026-04-09',
    available_weight_kg: 18, price_per_kg_eur: 3.20,
    total_weight_kg: 30, min_booking_kg: 5,
    discount_pct: 10, original_price_per_kg_eur: 3.55,
    driver_rating: 5.0, driver_trip_count: 12, driver_verified: true,
    forbidden_items: ['Weapons'],
    driver: { id: 'd4', full_name: 'Karim H.', avatar_url: null, phone: null, phone_verified: true, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [],
  },
  {
    id: '5', driver_id: 'd5', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Cologne',   origin_country: 'Germany',
    destination_city: 'Gabès', destination_country: 'Tunisia',
    departure_date: '2026-04-08',
    estimated_arrival_date: '2026-04-12',
    available_weight_kg: 8, price_per_kg_eur: 4.20,
    total_weight_kg: 20, min_booking_kg: 2,
    driver_rating: 4.6, driver_trip_count: 35, driver_verified: false,
    driver: { id: 'd5', full_name: 'Sami R.', avatar_url: null, phone: null, phone_verified: false, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [],
  },
  {
    id: '6', driver_id: 'd6', status: 'active', notes: null,
    created_at: '', updated_at: '',
    origin_city: 'Frankfurt',  origin_country: 'Germany',
    destination_city: 'Tunis', destination_country: 'Tunisia',
    departure_date: '2026-04-12',
    estimated_arrival_date: '2026-04-16',
    available_weight_kg: 22, price_per_kg_eur: 3.60,
    total_weight_kg: 35, min_booking_kg: 8,
    driver_rating: 4.8, driver_trip_count: 19, driver_verified: true,
    driver: { id: 'd6', full_name: 'Nabil M.', avatar_url: null, phone: null, phone_verified: true, stripe_customer_id: null, created_at: '', updated_at: '' },
    route_stops: [
      { id: 's6', route_id: '6', city: 'Sfax', country: 'Tunisia', stop_order: 1, arrival_date: '2026-04-17', is_pickup_available: false, is_dropoff_available: true },
    ],
  },
];

// ─── Sort + filter types ───────────────────────────────────────────────────────

type SortKey = 'earliest' | 'cheapest' | 'rated';
type Direction = 'all' | 'eu-tn' | 'tn-eu';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'earliest', label: 'Earliest' },
  { key: 'cheapest', label: 'Cheapest' },
  { key: 'rated',    label: 'Highest rated' },
];

// ─── No-results state ─────────────────────────────────────────────────────────

function NoResults({ fromCity, toCity, onSubmitRequest }: {
  fromCity: string; toCity: string; onSubmitRequest: () => void;
}) {
  return (
    <View style={empty.root}>
      <Text style={empty.emoji}>🔍</Text>
      <Text style={empty.title}>No drivers found</Text>
      <Text style={empty.desc}>
        No drivers are scheduled for {fromCity} → {toCity} on this date.
      </Text>
      <TouchableOpacity style={empty.btn} onPress={onSubmitRequest} activeOpacity={0.85}>
        <Text style={empty.btnText}>Submit a request instead →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const router = useRouter();
  const { fromCity, toCity, isSearching } = useSearchStore();
  const { setRoute } = useBookingStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [sort, setSort]           = useState<SortKey>('earliest');
  const [showFilter, setShowFilter] = useState(false);
  const [direction, setDirection] = useState<Direction>('all');
  const [minCapInput, setMinCapInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');

  // Parse filter inputs
  const minCapacity = parseFloat(minCapInput)  || 0;
  const maxPrice    = parseFloat(maxPriceInput) || Infinity;

  // Apply filter + sort to mock routes
  const displayed = useMemo(() => {
    let list = [...MOCK_ROUTES];

    // Direction filter
    if (direction === 'eu-tn') {
      list = list.filter((r) => r.origin_country !== 'Tunisia');
    } else if (direction === 'tn-eu') {
      list = list.filter((r) => r.origin_country === 'Tunisia');
    }

    // Capacity filter
    if (minCapacity > 0) {
      list = list.filter((r) => r.available_weight_kg >= minCapacity);
    }

    // Price filter
    if (isFinite(maxPrice)) {
      list = list.filter((r) => r.price_per_kg_eur <= maxPrice);
    }

    // Sort
    if (sort === 'earliest') {
      list.sort((a, b) => a.departure_date.localeCompare(b.departure_date));
    } else if (sort === 'cheapest') {
      list.sort((a, b) => a.price_per_kg_eur - b.price_per_kg_eur);
    } else {
      list.sort((a, b) => (b.driver_rating ?? 0) - (a.driver_rating ?? 0));
    }

    return list;
  }, [sort, direction, minCapacity, maxPrice]);

  const activeFilterCount = (direction !== 'all' ? 1 : 0)
    + (minCapacity > 0 ? 1 : 0)
    + (isFinite(maxPrice) ? 1 : 0);

  const handleSelect = (route: RouteCardRoute) => {
    setRoute(route as any);
    router.push(`/routes/${route.id}`);
  };

  // ── Shared filter controls (used in both sidebar and mobile panel) ──────────
  const FilterControls = () => (
    <>
      {/* Sort */}
      <Text style={s.filterLabel}>SORT BY</Text>
      <View style={s.sidebarSortCol}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[s.sidebarSortItem, sort === opt.key && s.sidebarSortItemActive]}
            onPress={() => setSort(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.sidebarSortText, sort === opt.key && s.sidebarSortTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.sidebarDivider} />

      {/* Direction */}
      <Text style={s.filterLabel}>DIRECTION</Text>
      <View style={s.dirCol}>
        {(['all', 'eu-tn', 'tn-eu'] as Direction[]).map((d) => (
          <TouchableOpacity
            key={d}
            style={[s.dirChip, direction === d && s.dirChipActive]}
            onPress={() => setDirection(d)}
            activeOpacity={0.75}
          >
            <Text style={[s.dirChipText, direction === d && s.dirChipTextActive]}>
              {d === 'all' ? 'All directions' : d === 'eu-tn' ? 'EU → TN' : 'TN → EU'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.sidebarDivider} />

      {/* Min capacity */}
      <Text style={s.filterLabel}>MIN CAPACITY</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={Colors.text.tertiary}
          keyboardType="numeric"
          value={minCapInput}
          onChangeText={setMinCapInput}
        />
        <Text style={s.inputUnit}>kg</Text>
      </View>

      {/* Max price */}
      <Text style={[s.filterLabel, { marginTop: Spacing.sm }]}>MAX PRICE</Text>
      <View style={s.inputWrap}>
        <Text style={s.inputUnit}>€</Text>
        <TextInput
          style={s.input}
          placeholder="any"
          placeholderTextColor={Colors.text.tertiary}
          keyboardType="numeric"
          value={maxPriceInput}
          onChangeText={setMaxPriceInput}
        />
        <Text style={s.inputUnit}>/kg</Text>
      </View>

      {/* Reset */}
      {activeFilterCount > 0 && (
        <TouchableOpacity
          style={s.resetBtn}
          onPress={() => { setDirection('all'); setMinCapInput(''); setMaxPriceInput(''); }}
          activeOpacity={0.7}
        >
          <Text style={s.resetText}>Reset filters</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // ── Card list ────────────────────────────────────────────────────────────────
  const CardList = () => isSearching ? (
    <View style={s.list}>
      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  ) : (
    <FlatList
      data={displayed}
      keyExtractor={(item) => item.id}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <RouteCard route={item} onPress={() => handleSelect(item)} />
      )}
      ListEmptyComponent={
        <NoResults
          fromCity={fromCity || 'this origin'}
          toCity={toCity || 'this destination'}
          onSubmitRequest={() => router.push('/shipping-requests/new')}
        />
      }
    />
  );

  return (
    <SafeAreaView style={s.root}>

      {/* ── Header — always at top ───────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerRoute}>{fromCity || 'Origin'} → {toCity || 'Destination'}</Text>
          {!isSearching && (
            <Text style={s.headerCount}>{displayed.length} route{displayed.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        {/* Filter toggle only on mobile */}
        {!isWide && (
          <TouchableOpacity
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setShowFilter((v) => !v)}
            activeOpacity={0.7}
          >
            {showFilter
              ? <X size={16} color={activeFilterCount > 0 ? Colors.white : Colors.text.primary} strokeWidth={2.5} />
              : <SlidersHorizontal size={16} color={activeFilterCount > 0 ? Colors.white : Colors.text.primary} strokeWidth={2} />
            }
            {activeFilterCount > 0 && (
              <Text style={s.filterBadge}>{activeFilterCount}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isWide ? (
        /* ── Wide: sidebar + cards ───────────────────────── */
        <View style={s.wideBody}>
          <ScrollView style={s.sidebar} contentContainerStyle={s.sidebarContent} showsVerticalScrollIndicator={false}>
            <FilterControls />
          </ScrollView>
          <View style={s.cardArea}>
            <CardList />
          </View>
        </View>
      ) : (
        /* ── Mobile: stacked sort + filter + cards ───────── */
        <>
          <View style={s.sortRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortScroll}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.sortChip, sort === opt.key && s.sortChipActive]}
                  onPress={() => setSort(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.sortChipText, sort === opt.key && s.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {showFilter && (
            <View style={s.filterPanel}>
              {/* Direction */}
              <Text style={s.filterLabel}>DIRECTION</Text>
              <View style={s.dirRow}>
                {(['all', 'eu-tn', 'tn-eu'] as Direction[]).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[s.dirChip, direction === d && s.dirChipActive]}
                    onPress={() => setDirection(d)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.dirChipText, direction === d && s.dirChipTextActive]}>
                      {d === 'all' ? 'All' : d === 'eu-tn' ? 'EU → TN' : 'TN → EU'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Capacity + Price */}
              <View style={s.inputRow}>
                <View style={s.inputGroup}>
                  <Text style={s.filterLabel}>MIN CAPACITY</Text>
                  <View style={s.inputWrap}>
                    <TextInput style={s.input} placeholder="0" placeholderTextColor={Colors.text.tertiary} keyboardType="numeric" value={minCapInput} onChangeText={setMinCapInput} />
                    <Text style={s.inputUnit}>kg</Text>
                  </View>
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.filterLabel}>MAX PRICE</Text>
                  <View style={s.inputWrap}>
                    <Text style={s.inputUnit}>€</Text>
                    <TextInput style={s.input} placeholder="any" placeholderTextColor={Colors.text.tertiary} keyboardType="numeric" value={maxPriceInput} onChangeText={setMaxPriceInput} />
                    <Text style={s.inputUnit}>/kg</Text>
                  </View>
                </View>
              </View>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={s.resetBtn} onPress={() => { setDirection('all'); setMinCapInput(''); setMaxPriceInput(''); }} activeOpacity={0.7}>
                  <Text style={s.resetText}>Reset filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <CardList />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },

  // Header — always at top, full width
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
    zIndex: 10,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerRoute: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerCount: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBadge: { fontSize: 11, fontWeight: '700', color: Colors.white },

  // Wide layout
  wideBody: { flex: 1, flexDirection: 'row' },
  sidebar: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.border.light,
  },
  sidebarContent: { padding: Spacing.base, gap: Spacing.sm },
  sidebarDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.sm,
  },
  sidebarSortCol: { gap: Spacing.xs },
  sidebarSortItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sidebarSortItemActive: { backgroundColor: Colors.primaryLight },
  sidebarSortText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  sidebarSortTextActive: { fontWeight: '700', color: Colors.text.primary },
  dirCol: { gap: Spacing.xs },
  cardArea: { flex: 2 },

  // Mobile sort bar
  sortRow: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sortScroll: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  sortChipActive: { backgroundColor: Colors.primary },
  sortChipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  sortChipTextActive: { color: Colors.white, fontWeight: '700' },

  // Mobile filter panel
  filterPanel: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.md,
  },
  filterLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1,
    color: Colors.text.tertiary, marginBottom: 2,
  },
  dirRow: { flexDirection: 'row', gap: Spacing.sm },
  dirChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  dirChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dirChipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  dirChipTextActive: { color: Colors.white, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: Spacing.base },
  inputGroup: { flex: 1, gap: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    paddingVertical: 0,
    ...Platform.select({ web: { outlineWidth: 0 } as any }),
  },
  inputUnit: { fontSize: FontSize.sm, color: Colors.text.tertiary, fontWeight: '500' },
  resetBtn: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  resetText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },

  // Card list
  list: { padding: Spacing.base, flexGrow: 1 },
});

const empty = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing['4xl'],
  },
  emoji: { fontSize: 48, marginBottom: Spacing.base },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm, textAlign: 'center' },
  desc: { fontSize: FontSize.sm, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
