import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SectionList,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useCities, type CityRow } from '@/hooks/useCities';
import type { CitySection } from '../types';

interface CityPickerModalProps {
  visible: boolean;
  title: string;
  citiesByCountry: Record<string, CityRow[]>;
  onSelect: (city: CityRow) => void;
  onClose: () => void;
}

export function CityPickerModal({
  visible,
  title,
  citiesByCountry,
  onSelect,
  onClose,
}: CityPickerModalProps) {
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  closeText: { fontSize: 18, color: Colors.text.secondary },
  searchWrap: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  search: { borderWidth: 1, borderColor: Colors.border.light, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: Colors.text.primary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  sectionFlag: { fontSize: 16 },
  sectionName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  cityName: { fontSize: FontSize.sm, color: Colors.text.primary },
  chevron: { fontSize: 18, color: Colors.text.secondary },
});
