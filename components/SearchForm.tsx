import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SectionList,
  TextInput,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addDays, isBefore, subMonths, addMonths, isToday, isSameDay } from 'date-fns';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useSearchStore } from '@/stores/searchStore';
import { useCities, type CityRow } from '@/hooks/useCities';

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
        ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
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

        <View style={dateS.grid}>
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
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Search Form ──────────────────────────────────────────────────────────────

export default function SearchForm() {
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

  useEffect(() => {
    if (departFromDate) {
      try {
        setSelectedDate(new Date(departFromDate));
      } catch {}
    }
  }, [departFromDate]);

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
    <>
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
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
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
