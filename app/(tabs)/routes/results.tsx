import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SectionList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, addDays, isBefore, subMonths, addMonths, isToday, isSameDay,
} from 'date-fns';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SlidersHorizontal, X, Bell, BellOff, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { FeaturedRouteCard } from '@/app/route-discovery/components/FeaturedRouteCard';
import { RouteDetailsModal } from '@/app/route-discovery/components/RouteDetailsModal';
import { mapRouteResultToFeaturedRoute } from '@/app/route-discovery/utils/mapRouteResult';
import { useCitiesStore } from '@/stores/citiesStore';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSearchStore } from '@/stores/searchStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouteResults, type RouteResult, type SortKey, type FilterState } from '@/hooks/useRouteResults';
import { useCities, type CityRow } from '@/hooks/useCities';
import { supabase } from '@/lib/supabase';
import { parseISO } from 'date-fns';

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'earliest',  label: 'Earliest' },
  { key: 'cheapest',  label: 'Cheapest' },
  { key: 'top_rated', label: 'Top rated' },
];

// ─── Route Alert Sheet ────────────────────────────────────────────────────────

type CitySection = { country: string; flag: string; data: CityRow[] };

function CityPickerModal({
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
        ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) && !c.coming_soon)
        : cities.filter((c) => !c.coming_soon),
    }),
  ).filter((s) => s.data.length > 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={cp.root}>
        <View style={cp.header}>
          <Text style={cp.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={cp.closeBtn}>
            <Text style={cp.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={cp.searchWrap}>
          <TextInput
            style={cp.search}
            placeholder="Search city…"
            placeholderTextColor={Colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={cp.sectionHeader}>
              <Text style={cp.sectionFlag}>{section.flag}</Text>
              <Text style={cp.sectionName}>{section.country}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={cp.item}
              onPress={() => { onSelect(item); onClose(); setQuery(''); }}
              activeOpacity={0.7}
            >
              <Text style={cp.cityName}>{item.name}</Text>
              <Text style={cp.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Inline date picker (used inside alert sheet) ────────────────────────────

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildWeeks(month: Date): (Date | null)[][] {
  const monthStart = startOfMonth(month);
  const monthEnd   = endOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 0 });
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

function InlineDatePicker({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date | null) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  const weeks = buildWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today));

  return (
    <View style={dp.root}>
      {/* Month nav */}
      <View style={dp.monthNav}>
        <TouchableOpacity
          style={[dp.navBtn, !canGoPrev && dp.navBtnOff]}
          onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
          activeOpacity={0.7}
        >
          <Text style={[dp.navArrow, !canGoPrev && dp.navArrowOff]}>‹</Text>
        </TouchableOpacity>
        <Text style={dp.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          style={dp.navBtn}
          onPress={() => setViewMonth((m) => addMonths(m, 1))}
          activeOpacity={0.7}
        >
          <Text style={dp.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week row */}
      <View style={dp.dowRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={dp.dowLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar */}
      {weeks.map((week, wi) => (
        <View key={wi} style={dp.week}>
          {week.map((d, di) => {
            if (!d) return <View key={di} style={dp.cell} />;
            const isPast    = isBefore(d, today) && !isToday(d);
            const isSel     = !!selected && isSameDay(d, selected);
            const isToday_  = isToday(d);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[dp.cell, isSel && dp.cellSel, isToday_ && !isSel && dp.cellToday]}
                onPress={() => !isPast && onSelect(isSel ? null : d)}
                activeOpacity={isPast ? 1 : 0.75}
                disabled={isPast}
              >
                <Text style={[
                  dp.cellNum,
                  isPast   && dp.cellNumPast,
                  isSel    && dp.cellNumSel,
                  isToday_ && !isSel && dp.cellNumToday,
                ]}>
                  {format(d, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Any time shortcut */}
      {selected && (
        <TouchableOpacity style={dp.anyTime} onPress={() => onSelect(null)} activeOpacity={0.7}>
          <Text style={dp.anyTimeText}>Any date  ✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Route Alert Sheet ────────────────────────────────────────────────────────

function RouteAlertSheet({
  visible,
  initialFrom,
  initialTo,
  initialDate,
  profile,
  onClose,
}: {
  visible: boolean;
  initialFrom: string;
  initialTo: string;
  initialDate: string; // ISO date, e.g. "2026-03-19"
  profile: { id: string } | null;
  onClose: () => void;
}) {
  const { citiesByCountry } = useCities();
  const [fromCity, setFromCity] = useState(initialFrom);
  const [fromCityId, setFromCityId] = useState('');
  const [toCity, setToCity]     = useState(initialTo);
  const [toCityId, setToCityId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with parent's initial values whenever sheet opens
  useEffect(() => {
    if (visible) {
      setFromCity(initialFrom);
      setToCity(initialTo);
      setDateFrom(null);
      setSubmitted(false);
      setError(null);
    }
  }, [visible, initialFrom, initialTo, initialDate]);

  const canSubmit = !!fromCity && !!toCity && !!profile;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('route_alerts' as any)
        .insert({
          user_id: profile!.id,
          origin_city: fromCity,
          origin_city_id: fromCityId || null,
          destination_city: toCity,
          destination_city_id: toCityId || null,
          date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
        });
      if (dbError) throw dbError;

      // Insert a confirmation notification so the user sees the alert in their inbox
      const dateLabel = dateFrom ? ` from ${format(dateFrom, 'MMM d, yyyy')}` : '';
      await supabase.from('notifications').insert({
        user_id: profile!.id,
        type: 'route_alert_created',
        message: `Alert saved: you'll be notified when a ${fromCity} → ${toCity} route is published${dateLabel}.`,
      });

      setSubmitted(true);
    } catch {
      setError('Could not save alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={alert.root}>

          {/* Header */}
          <View style={alert.header}>
            <View style={alert.headerLeft}>
              <Bell size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={alert.headerTitle}>Route Alert</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={alert.closeBtn}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            /* ── Success state ───────────────────────────── */
            <View style={alert.successRoot}>
              <View style={alert.successIcon}>
                <Check size={32} color={Colors.white} strokeWidth={2.5} />
              </View>
              <Text style={alert.successTitle}>Alert saved!</Text>
              <Text style={alert.successDesc}>
                We'll notify you as soon as a driver publishes a route from{' '}
                <Text style={alert.successBold}>{fromCity}</Text> to{' '}
                <Text style={alert.successBold}>{toCity}</Text>
                {dateFrom ? (
                  <Text> departing from{' '}
                    <Text style={alert.successBold}>{format(dateFrom, 'MMM d, yyyy')}</Text>
                  </Text>
                ) : null}.
              </Text>
              <TouchableOpacity style={alert.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={alert.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form ────────────────────────────────────── */
            <ScrollView contentContainerStyle={alert.body} keyboardShouldPersistTaps="handled">
              <Text style={alert.desc}>
                We'll send you a push notification when a driver publishes a matching route. You can change the cities below.
              </Text>

              {/* From */}
              <Text style={alert.label}>FROM</Text>
              <TouchableOpacity
                style={alert.field}
                onPress={() => setShowFromPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={fromCity ? alert.fieldValue : alert.fieldPlaceholder}>
                  {fromCity || 'Select origin city'}
                </Text>
                <Text style={alert.fieldChevron}>›</Text>
              </TouchableOpacity>

              {/* To */}
              <Text style={[alert.label, { marginTop: Spacing.md }]}>TO</Text>
              <TouchableOpacity
                style={alert.field}
                onPress={() => setShowToPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={toCity ? alert.fieldValue : alert.fieldPlaceholder}>
                  {toCity || 'Select destination city'}
                </Text>
                <Text style={alert.fieldChevron}>›</Text>
              </TouchableOpacity>

              {/* Date */}
              <Text style={[alert.label, { marginTop: Spacing.lg ?? Spacing.xl }]}>FROM DATE</Text>
              <Text style={alert.dateHint}>
                {dateFrom
                  ? `Alert me for routes departing from ${format(dateFrom, 'EEE, MMM d yyyy')}`
                  : 'Alert me for any upcoming date'}
              </Text>
              <InlineDatePicker selected={dateFrom} onSelect={setDateFrom} />

              {!profile && (
                <View style={alert.loginNotice}>
                  <BellOff size={14} color={Colors.text.tertiary} strokeWidth={2} />
                  <Text style={alert.loginNoticeText}>Sign in to save alerts</Text>
                </View>
              )}

              {error && <Text style={alert.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[alert.submitBtn, (!canSubmit || isSubmitting) && alert.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                activeOpacity={0.85}
              >
                <Bell size={16} color={Colors.white} strokeWidth={2} />
                <Text style={alert.submitBtnText}>
                  {isSubmitting ? 'Saving…' : 'Notify me'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <CityPickerModal
        visible={showFromPicker}
        title="Select origin city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setFromCity(c.name); setFromCityId(c.id); }}
        onClose={() => setShowFromPicker(false)}
      />
      <CityPickerModal
        visible={showToPicker}
        title="Select destination city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setToCity(c.name); setToCityId(c.id); }}
        onClose={() => setShowToPicker(false)}
      />
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoResults({
  fromCity,
  toCity,
  hasFilters,
  onShowAll,
  onSetAlert,
}: {
  fromCity: string;
  toCity: string;
  hasFilters: boolean;
  onShowAll: () => void;
  onSetAlert: () => void;
}) {
  return (
    <View style={empty.root}>
      <Text style={empty.emoji}>🚛</Text>
      <Text style={empty.title}>No matching routes found</Text>
      <Text style={empty.desc}>
        {hasFilters
          ? `No routes match your current filters for ${fromCity} → ${toCity}.`
          : `No drivers are currently scheduled from ${fromCity} to ${toCity}.`}
      </Text>

      {hasFilters && (
        <TouchableOpacity style={empty.secondaryBtn} onPress={onShowAll} activeOpacity={0.85}>
          <Text style={empty.secondaryBtnText}>Clear filters</Text>
        </TouchableOpacity>
      )}

      <View style={empty.alertCard}>
        <View style={empty.alertCardTop}>
          <Bell size={22} color={Colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={empty.alertCardTitle}>Get notified when a route opens</Text>
            <Text style={empty.alertCardDesc}>
              Be the first to know when a driver publishes a route on this corridor.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={empty.alertBtn} onPress={onSetAlert} activeOpacity={0.85}>
          <Text style={empty.alertBtnText}>Set up alert →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

  // Use params if provided (from OriginCountryPicker card), otherwise use store
  const originCityName = params.origin_city_name ?? store.fromCityName;
  const originCountry  = params.origin_country ?? store.fromCountry;
  const originCityId   = params.origin_city_id ?? store.fromCityId;
  const destCityName   = store.toCityName;
  const destCountry    = store.toCountry;
  const destCityId     = params.destination_city_id ?? store.toCityId;
  const departFromDate = params.depart_from_date ?? store.departFromDate;

  // Track if searching by country only (from card click - no specific city)
  const isCountrySearch = originCountry && !originCityName;

  const {
    tier1,
    tier2,
    sortKey,
    setSortKey,
    filters,
    setFilters,
    activeFilterCount,
    isFetching,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh,
  } = useRouteResults({ originCityName, originCountry, originCityId, destCityName, destCountry, destCityId, departFromDate });

  const [showFilter, setShowFilter]     = useState(false);
  const [showAlert, setShowAlert]       = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
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

  // Re-fetch whenever search params change (always fetch — no origin = show all routes)
  useEffect(() => {
    refresh();
  }, [originCityName, originCountry, destCityName, departFromDate, refresh]);

  const handleApplyFilters = () => {
    const minCap   = parseFloat(minCapInput)   || undefined;
    const maxPrice = parseFloat(maxPriceInput) || undefined;
    setFilters({ ...filters, minCapacityKg: minCap, maxPriceEur: maxPrice });
  };

  const handleSelect = (routeId: string) => {
    const route = [...tier1, ...tier2].find((r) => r.id === routeId);
    if (route) setRoute(route as any);
    setSelectedRouteId(null);
    router.push('/booking');
  };

  const totalCount = tier1.length + tier2.length;

  type ListItem =
    | { type: 'route'; route: RouteResult }
    | { type: 'header'; label: string };

  const listData: ListItem[] = [
    ...tier1.map((r): ListItem => ({ type: 'route', route: r })),
    ...(tier2.length > 0
      ? [
          { type: 'header', label: 'Other routes in region' } as ListItem,
          ...tier2.map((r): ListItem => ({ type: 'route', route: r })),
        ]
      : []),
  ];

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

      <Text style={s.filterLabel}>MIN CAPACITY</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={Colors.text.tertiary}
          keyboardType="numeric"
          value={minCapInput}
          onChangeText={setMinCapInput}
          onEndEditing={handleApplyFilters}
        />
        <Text style={s.inputUnit}>kg</Text>
      </View>

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
          onEndEditing={handleApplyFilters}
        />
        <Text style={s.inputUnit}>/kg</Text>
      </View>

      {activeFilterCount > 0 && (
        <TouchableOpacity
          style={s.resetBtn}
          onPress={() => { setMinCapInput(''); setMaxPriceInput(''); setFilters({}); }}
          activeOpacity={0.7}
        >
          <Text style={s.resetText}>Reset filters</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const cardList = isFetching ? (
    <View style={s.list}>
      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  ) : (
    <FlatList
      data={listData}
      keyExtractor={(item, i) =>
        item.type === 'route' ? item.route.id : `header-${i}`
      }
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      renderItem={({ item }) => {
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
      ListFooterComponent={isFetchingMore ? <SkeletonCard /> : null}
      ListEmptyComponent={
        <NoResults
          fromCity={originCityName || 'this origin'}
          toCity={destCityName || 'this destination'}
          hasFilters={activeFilterCount > 0}
          onShowAll={() => { setMinCapInput(''); setMaxPriceInput(''); setFilters({}); }}
          onSetAlert={() => setShowAlert(true)}
        />
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
              <View style={s.inputRow}>
                <View style={s.inputGroup}>
                  <Text style={s.filterLabel}>MIN CAPACITY</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={s.input}
                      placeholder="0"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="numeric"
                      value={minCapInput}
                      onChangeText={setMinCapInput}
                      onEndEditing={handleApplyFilters}
                    />
                    <Text style={s.inputUnit}>kg</Text>
                  </View>
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.filterLabel}>MAX PRICE</Text>
                  <View style={s.inputWrap}>
                    <Text style={s.inputUnit}>€</Text>
                    <TextInput
                      style={s.input}
                      placeholder="any"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="numeric"
                      value={maxPriceInput}
                      onChangeText={setMaxPriceInput}
                      onEndEditing={handleApplyFilters}
                    />
                    <Text style={s.inputUnit}>/kg</Text>
                  </View>
                </View>
              </View>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={s.resetBtn}
                  onPress={() => { setMinCapInput(''); setMaxPriceInput(''); setFilters({}); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.resetText}>Reset filters</Text>
                </TouchableOpacity>
              )}
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
        initialDate={departFromDate}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary }}>Departure date</Text>
            <TouchableOpacity onPress={() => setShowDateFilter(false)} style={{ padding: Spacing.sm }}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
            <InlineDatePicker
              selected={filterDate}
              onSelect={(d) => {
                setDepartFromDate(d ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
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

  list: { padding: Spacing.base, flexGrow: 1, gap: Spacing.md },

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
});

// ─── Empty state styles ───────────────────────────────────────────────────────

const empty = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
  },
  emoji: { fontSize: 52, marginBottom: Spacing.base }, // 🚛
  title: {
    fontSize: FontSize.xl, fontWeight: '800',
    color: Colors.text.primary, textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    textAlign: 'center', lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  secondaryBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },

  alertCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  alertCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  alertCardTitle: {
    fontSize: FontSize.base, fontWeight: '700',
    color: Colors.text.primary, marginBottom: 3,
  },
  alertCardDesc: {
    fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20,
  },
  alertBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  alertBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});

// ─── Alert sheet styles ───────────────────────────────────────────────────────

const alert = StyleSheet.create({
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },

  body: { padding: Spacing.base, gap: 0 },
  desc: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    lineHeight: 22, marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  label: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1,
    color: Colors.text.tertiary, marginBottom: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  fieldValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  fieldPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary },
  fieldChevron: { fontSize: 22, color: Colors.text.tertiary },

  loginNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  loginNoticeText: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  dateHint: {
    fontSize: FontSize.xs, color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: FontSize.sm, color: Colors.error,
    fontWeight: '600', marginTop: Spacing.md,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    marginTop: Spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },

  // Success
  successRoot: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSize['2xl'], fontWeight: '800',
    color: Colors.text.primary, marginBottom: Spacing.md,
  },
  successDesc: {
    fontSize: FontSize.base, color: Colors.text.secondary,
    textAlign: 'center', lineHeight: 24, marginBottom: Spacing['2xl'],
  },
  successBold: { fontWeight: '700', color: Colors.text.primary },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
  },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});

// ─── Inline date picker styles ───────────────────────────────────────────────

const dp = StyleSheet.create({
  root: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnOff: { opacity: 0.3 },
  navArrow: { fontSize: 20, color: Colors.text.primary, lineHeight: 24 },
  navArrowOff: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },

  dowRow: { flexDirection: 'row', marginBottom: 2 },
  dowLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 10, fontWeight: '700',
    color: Colors.text.tertiary,
    letterSpacing: 0.3,
  },

  week: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  cell: {
    flex: 1, aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  cellSel: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellNum: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  cellNumPast: { color: Colors.text.tertiary },
  cellNumSel: { color: Colors.white },
  cellNumToday: { fontWeight: '800' },

  anyTime: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.tertiary,
  },
  anyTimeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
});

// ─── City picker modal styles ─────────────────────────────────────────────────

const cp = StyleSheet.create({
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
    fontSize: FontSize.xs, fontWeight: '700',
    color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8,
  },
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
