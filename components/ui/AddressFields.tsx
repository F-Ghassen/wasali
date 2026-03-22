import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { City } from '@/stores/citiesStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddressFieldsProps {
  street: string;
  postalCode: string;
  city: string;
  cityOptions?: City[];
  onChange: (field: 'street' | 'postalCode' | 'city', value: string) => void;
  onCityPickerOpen?: () => void;
  readOnlyCity?: boolean;
  label?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressFields({
  street, postalCode, city, cityOptions, onChange, onCityPickerOpen, readOnlyCity, label,
}: AddressFieldsProps) {
  return (
    <View style={s.root}>
      {label && <Text style={s.groupLabel}>{label}</Text>}

      <Text style={s.fieldLabel}>Street address</Text>
      <TextInput
        style={s.input}
        placeholder="e.g. 12 Hauptstraße"
        placeholderTextColor={Colors.text.tertiary}
        value={street}
        onChangeText={(v) => onChange('street', v)}
      />

      <View style={s.twoCol}>
        <View style={s.twoColLeft}>
          <Text style={s.fieldLabel}>Postal code</Text>
          <TextInput
            style={s.input}
            placeholder="10115"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="numeric"
            value={postalCode}
            onChangeText={(v) => onChange('postalCode', v)}
          />
        </View>
        <View style={s.twoColRight}>
          <Text style={s.fieldLabel}>City</Text>
          {readOnlyCity ? (
            <View style={[s.input, s.cityReadOnly]}>
              <Text style={city ? s.cityValue : s.cityPlaceholder} numberOfLines={1}>
                {city || 'From itinerary'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.input, s.cityPickerBtn]}
              onPress={onCityPickerOpen}
              activeOpacity={0.75}
            >
              <Text style={city ? s.cityValue : s.cityPlaceholder} numberOfLines={1}>
                {city || 'Select city'}
              </Text>
              <ChevronDown size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 0 },
  groupLabel: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  twoCol: { flexDirection: 'row', gap: Spacing.sm },
  twoColLeft: { flex: 1 },
  twoColRight: { flex: 1.5 },
  cityPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityReadOnly: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.light,
  },
  cityValue: { fontSize: FontSize.base, color: Colors.text.primary, flex: 1 },
  cityPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary, flex: 1 },
});
