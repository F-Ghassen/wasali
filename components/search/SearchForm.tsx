import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useSearchStore } from '@/stores/searchStore';
import { useCities } from '@/hooks/useCities';
import { CityPickerModal } from './CityPickerModal';
import { InlineDatePicker } from './InlineDatePicker';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Seed the store with today on first mount so the date chip shows "Today"
  // and the results page filters from today by default.
  useEffect(() => {
    if (!departFromDate) {
      setDepartFromDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (departFromDate) {
      try {
        setSelectedDate(new Date(departFromDate));
      } catch { /* invalid date string — keep previous */ }
    } else {
      setSelectedDate(null);
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

  const handleDateSelect = (d: Date | null) => {
    setSelectedDate(d);
    setDepartFromDate(d ? format(d, 'yyyy-MM-dd') : null);
    if (d) setShowDate(false);
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
          <Search size={18} color={Colors.white} strokeWidth={2.5} />
          <Text style={s.searchBtnText}>{t('home.searchDrivers')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <CityPickerModal
        visible={showFrom}
        title={t('home.fromSelectCity')}
        citiesByCountry={citiesByCountry}
        onSelect={(c) => setFromCity(c.id, c.name, c.country)}
        onClose={() => setShowFrom(false)}
      />
      <CityPickerModal
        visible={showTo}
        title={t('home.toSelectCity')}
        citiesByCountry={citiesByCountry}
        onSelect={(c) => setToCity(c.id, c.name, c.country)}
        onClose={() => setShowTo(false)}
      />
      <Modal visible={showDate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDate(false)}>
        <SafeAreaView style={s.dateModalRoot}>
          <View style={s.dateModalHeader}>
            <Text style={s.dateModalTitle}>{t('home.departBeforeTitle')}</Text>
            <TouchableOpacity onPress={() => setShowDate(false)} style={s.dateModalCloseBtn}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.dateModalBody}>
            <InlineDatePicker selected={selectedDate} onSelect={handleDateSelect} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  searchBtnDisabled: { opacity: 0.3 },
  searchBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.3,
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
