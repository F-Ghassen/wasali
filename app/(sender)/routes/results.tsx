import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { FeaturedRouteCard } from '@/components/route-discovery/FeaturedRouteCard';
import { RouteDetailsModal } from '@/components/route-discovery/RouteDetailsModal';
import { mapRouteResultToFeaturedRoute } from '@/app/route-discovery/utils/mapRouteResult';
import { useCitiesStore } from '@/stores/citiesStore';
import { SkeletonCard } from '@/components/shared/ui/primitives/Skeleton';
import { useSearchStore } from '@/stores/searchStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouteResults, type RouteResult, type SortKey } from '@/hooks/useRouteResults';
import { useCities } from '@/hooks/useCities';
import {
  CityPickerModal,
  InlineDatePicker,
  RouteAlertSheet,
  RouteFilterControls,
  NoResults,
} from '@/components/search';
import { toNumericString, parseFilterNumber } from '@/utils/filterInput';

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'earliest',  label: 'Earliest' },
  { key: 'cheapest',  label: 'Cheapest' },
  { key: 'top_rated', label: 'Top rated' },
];

// ─── Results Screen ───────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    origin_city_id?: string;
    origin_city_name?: string;
    origin_country?: string;
    destination_city_id?: string;
    depart_from_date?: string;
  }>();

  const store = useSearchStore();
  const { setFromCity, setToCity, setDepartFromDate } = store;
  const { setRoute } = useBookingStore();
  const { profile } = useAuthStore();
  const { citiesByCountry } = useCities();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Use params if provided (from OriginCountryPicker card), otherwise use store.
  // For date: once the user explicitly changes it via the chip, the store takes precedence
  // over the URL param so that clearing ("Any date") works correctly.
  const originCityName = params.origin_city_name ?? store.fromCityName;
  const originCountry  = params.origin_country ?? store.fromCountry;
  const originCityId   = params.origin_city_id ?? store.fromCityId;
  const destCityName   = store.toCityName;
  const destCountry    = store.toCountry;
  const destCityId     = params.destination_city_id ?? store.toCityId;
  // Prefer the store's date (which is user-controlled) over the read-only URL param
  const departFromDate = store.departFromDate ?? params.depart_from_date ?? null;

  const {
    tier1,
    tier2,
    fallbackRoutes,
    sortKey,
    setSortKey,
    setFilters,
    activeFilterCount,
    isFetching,
    isFetchingFallback,
    isFetchingMore,
    loadMore,
    refresh,
  } = useRouteResults({ originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate });

  const [showFilter, setShowFilter]     = useState(false);
  const [showAlert, setShowAlert]       = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  const cities = useCitiesStore((s) => s.cities);
  const getCity = (id: string) => {
    const c = cities.find((c) => c.id === id);
    return c ? { name: c.name, country: c.country ?? '', flagEmoji: (c as any).flag_emoji ?? '🌍' } : undefined;
  };
  const [minCapInput, setMinCapInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');

  // Search param filters
  const [showFromFilter, setShowFromFilter] = useState(false);
  const [showToFilter, setShowToFilter]     = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const filterDate = departFromDate ? (() => { try { return parseISO(departFromDate); } catch { return null; } })() : null;

  // Re-fetch whenever any search param changes
  useEffect(() => {
    refresh();
  }, [originCityId, originCityName, originCountry, destCityId, destCityName, departFromDate, refresh]);

  // Apply both filters immediately whenever either input changes.
  // Use functional setFilters so each update merges onto the latest state,
  // not onto a potentially stale closure copy.
  const handleMinCapChange = (val: string) => {
    const sanitised = toNumericString(val);
    setMinCapInput(sanitised);
    setFilters((prev) => ({ ...prev, minCapacityKg: parseFilterNumber(sanitised) }));
  };

  const handleMaxPriceChange = (val: string) => {
    const sanitised = toNumericString(val);
    setMaxPriceInput(sanitised);
    setFilters((prev) => ({ ...prev, maxPriceEur: parseFilterNumber(sanitised) }));
  };

  const handleSelect = (routeId: string) => {
    const route = [...tier1, ...tier2].find((r) => r.id === routeId);
    if (route) setRoute(route as any);
    setSelectedRouteId(null);
    router.push({
      pathname: '/(sender)/booking/bookingCreation',
      params: { routeId },
    } as any);
  };

  const totalCount = tier1.length + tier2.length;

  type ListItem =
    | { type: 'route'; route: RouteResult }
    | { type: 'header'; label: string }
    | { type: 'no-results' };

  const listData: ListItem[] = totalCount > 0
    ? [
        ...tier1.map((r): ListItem => ({ type: 'route', route: r })),
        ...(tier2.length > 0
          ? [
              { type: 'header', label: 'Other routes in region' } as ListItem,
              ...tier2.map((r): ListItem => ({ type: 'route', route: r })),
            ]
          : []),
      ]
    : [
        // No matches: show alert card then all other active routes
        { type: 'no-results' } as ListItem,
        ...(!isFetchingFallback && fallbackRoutes.length > 0
          ? [
              { type: 'header', label: 'All other drivers' } as ListItem,
              ...fallbackRoutes.map((r): ListItem => ({ type: 'route', route: r })),
            ]
          : []),
      ];

  const resetFilters = () => { setMinCapInput(''); setMaxPriceInput(''); setFilters({}); };

  // Wide sidebar: sort chips + stacked filter inputs
  const filterControls = (
    <>
      <Text style={s.filterLabel}>SORT BY</Text>
      <View style={s.sidebarSortCol}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[s.sidebarSortItem, sortKey === opt.key && s.sidebarSortItemActive]}
            onPress={() => setSortKey(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.sidebarSortText, sortKey === opt.key && s.sidebarSortTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.sidebarDivider} />
      <RouteFilterControls
        layout="column"
        minCapInput={minCapInput}
        maxPriceInput={maxPriceInput}
        onMinCapChange={handleMinCapChange}
        onMaxPriceChange={handleMaxPriceChange}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      />
    </>
  );

  const cardList = isFetching ? (
    <View style={s.list}>
      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  ) : (
    <FlatList
      data={listData}
      keyExtractor={(item: ListItem, i) =>
        item.type === 'route' ? item.route.id : `${item.type}-${i}`
      }
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      renderItem={({ item }: { item: ListItem }) => {
        if (item.type === 'no-results') {
          return (
            <NoResults
              fromCity={originCityName || 'this origin'}
              toCity={destCityName || 'this destination'}
              hasFilters={activeFilterCount > 0}
              onShowAll={() => { setMinCapInput(''); setMaxPriceInput(''); setFilters({}); }}
              onSetAlert={() => setShowAlert(true)}
            />
          );
        }
        if (item.type === 'header') {
          return (
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>{item.label}</Text>
            </View>
          );
        }
        return (
          <FeaturedRouteCard
            route={mapRouteResultToFeaturedRoute(item.route, getCity)}
            onBook={(routeId) => setSelectedRouteId(routeId)}
          />
        );
      }}
      ListFooterComponent={
        isFetchingMore || isFetchingFallback
          ? <View style={s.footer}><ActivityIndicator size="small" color={Colors.text.tertiary} /></View>
          : null
      }
    />
  );

  return (
    <SafeAreaView style={s.root}>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          {!isFetching && (
            <Text style={s.headerCount}>
              {totalCount} route{totalCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
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

      {/* ── Search Params Bar ─────────────────────────────── */}
      <View style={s.searchBar}>
        <TouchableOpacity style={s.searchChip} onPress={() => setShowFromFilter(true)} activeOpacity={0.75}>
          <Text style={s.searchChipLabel}>FROM</Text>
          <View style={s.searchChipValueRow}>
            {originCountry && (
              <Text style={s.countryFlag}>
                {citiesByCountry[originCountry]?.[0]?.flag_emoji || '🌍'}
              </Text>
            )}
            <Text style={s.searchChipValue} numberOfLines={1}>
              {originCityName || originCountry || 'Any'}
            </Text>
          </View>
        </TouchableOpacity>
        <Text style={s.searchChipArrow}>→</Text>
        <TouchableOpacity style={s.searchChip} onPress={() => setShowToFilter(true)} activeOpacity={0.75}>
          <Text style={s.searchChipLabel}>TO</Text>
          <View style={s.searchChipValueRow}>
            {destCountry && (
              <Text style={s.countryFlag}>
                {citiesByCountry[destCountry]?.[0]?.flag_emoji || '🌍'}
              </Text>
            )}
            <Text style={s.searchChipValue} numberOfLines={1}>
              {destCityName || destCountry || 'Any'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[s.searchChip, s.searchChipDate]} onPress={() => setShowDateFilter(true)} activeOpacity={0.75}>
          <Text style={s.searchChipLabel}>DATE</Text>
          <Text style={s.searchChipValue} numberOfLines={1}>
            {filterDate ? format(filterDate, 'MMM d') : 'Any'}
          </Text>
        </TouchableOpacity>
      </View>

      {isWide ? (
        <View style={s.wideBody}>
          <ScrollView style={s.sidebar} contentContainerStyle={s.sidebarContent} showsVerticalScrollIndicator={false}>
            {filterControls}
          </ScrollView>
          <View style={s.cardArea}>{cardList}</View>
        </View>
      ) : (
        <>
          {/* Sort tabs */}
          <View style={s.sortRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortScroll}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.sortChip, sortKey === opt.key && s.sortChipActive]}
                  onPress={() => setSortKey(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.sortChipText, sortKey === opt.key && s.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {showFilter && (
            <View style={s.filterPanel}>
              <RouteFilterControls
                layout="row"
                minCapInput={minCapInput}
                maxPriceInput={maxPriceInput}
                onMinCapChange={handleMinCapChange}
                onMaxPriceChange={handleMaxPriceChange}
                activeFilterCount={activeFilterCount}
                onReset={resetFilters}
              />
            </View>
          )}

          {cardList}
        </>
      )}

      {/* ── Route Alert Sheet ─────────────────────────────── */}
      <RouteAlertSheet
        visible={showAlert}
        initialFrom={originCityName}
        initialTo={destCityName}
        profile={profile}
        onClose={() => setShowAlert(false)}
      />

      {/* ── Search param city pickers ─────────────────────── */}
      <CityPickerModal
        visible={showFromFilter}
        title="Select origin city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setFromCity(c.id, c.name, c.country); }}
        onClose={() => setShowFromFilter(false)}
      />
      <CityPickerModal
        visible={showToFilter}
        title="Select destination city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setToCity(c.id, c.name, c.country); }}
        onClose={() => setShowToFilter(false)}
      />

      {/* ── Search param date picker ──────────────────────── */}
      <Modal visible={showDateFilter} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDateFilter(false)}>
        <SafeAreaView style={s.dateModalRoot}>
          <View style={s.dateModalHeader}>
            <Text style={s.dateModalTitle}>Departure date</Text>
            <TouchableOpacity onPress={() => setShowDateFilter(false)} style={s.dateModalCloseBtn}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.dateModalBody}>
            <InlineDatePicker
              selected={filterDate}
              onSelect={(d) => {
                setDepartFromDate(d ? format(d, 'yyyy-MM-dd') : null);
                setShowDateFilter(false);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {selectedRouteId && (
        <RouteDetailsModal
          routeId={selectedRouteId}
          visible
          onClose={() => setSelectedRouteId(null)}
          onBook={handleSelect}
        />
      )}
    </SafeAreaView>
  );
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

  wideBody: { flex: 1, flexDirection: 'row' },
  sidebar: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.border.light,
  },
  sidebarContent: { padding: Spacing.base, gap: Spacing.sm },
  sidebarDivider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  sidebarSortCol: { gap: Spacing.xs },
  sidebarSortItem: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md },
  sidebarSortItemActive: { backgroundColor: Colors.primaryLight },
  sidebarSortText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  sidebarSortTextActive: { fontWeight: '700', color: Colors.text.primary },
  cardArea: { flex: 2 },

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

  list: { padding: Spacing.base, flexGrow: 1, gap: Spacing.md },
  footer: { paddingVertical: Spacing.xl, alignItems: 'center' },

  sectionHeader: {
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.xs,
  },
  searchChip: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchChipDate: { flex: 0.7 },
  searchChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.text.tertiary,
    marginBottom: 1,
  },
  searchChipValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchChipValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  countryFlag: {
    fontSize: 16,
  },
  searchChipArrow: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  dateModalRoot: { flex: 1, backgroundColor: Colors.background.primary },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  dateModalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  dateModalCloseBtn: { padding: Spacing.sm },
  dateModalBody: { padding: Spacing.base },
});

