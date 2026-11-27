import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PHONE_COUNTRIES } from '@/utils/phoneCountries';

interface CountryChipPickerProps {
  /** ISO alpha-2 code, or '' when nothing is selected. */
  value: string;
  onChange: (iso: string) => void;
  error?: string;
}

/** Horizontal chips for the residence country. Tapping the selected chip clears it. */
export function CountryChipPicker({ value, onChange, error }: CountryChipPickerProps) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {PHONE_COUNTRIES.map((country) => {
          const active = country.iso === value;
          return (
            <TouchableOpacity
              key={country.iso}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onChange(active ? '' : country.iso)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {country.flag} {country.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '500' },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: Spacing.xs },
});
