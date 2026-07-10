import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, SectionList, SafeAreaView,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { CityRow } from '@/hooks/useCities';

type CitySection = { country: string; flag: string; data: CityRow[]; comingSoon: boolean };

interface Props {
  visible: boolean;
  title: string;
  citiesByCountry: Record<string, CityRow[]>;
  onSelect: (city: CityRow) => void;
  onClose: () => void;
}

export function CityPickerModal({ visible, title, citiesByCountry, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const sections: CitySection[] = Object.entries(citiesByCountry)
    .map(([country, cities]) => ({
      country,
      flag: cities[0]?.flag_emoji ?? '',
      comingSoon: cities.every((c) => c.coming_soon),
      data: cities.filter(
        (c) => !c.coming_soon && (!query || c.name.toLowerCase().includes(query.toLowerCase())),
      ),
    }))
    .filter((sec) => sec.data.length > 0 || sec.comingSoon);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
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
            <View style={s.sectionHeader}>
              <Text style={s.sectionFlag}>{section.flag}</Text>
              <Text style={s.sectionName}>{section.country}</Text>
              {section.comingSoon && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>Coming soon</Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.item}
              onPress={() => { onSelect(item); onClose(); setQuery(''); }}
              activeOpacity={0.7}
            >
              <Text style={s.cityName}>{item.name}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  closeText: { fontSize: FontSize.lg, color: Colors.text.secondary },
  searchWrap: { padding: Spacing.base, paddingBottom: 0 },
  search: {
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    fontSize: FontSize.base, color: Colors.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  sectionFlag: { fontSize: 16 },
  sectionName: {
    flex: 1,
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
  },
  cityName: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text.primary },
  chevron: { fontSize: 18, color: Colors.text.tertiary },
});
