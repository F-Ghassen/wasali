import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PHONE_COUNTRIES, findPhoneCountry } from '@/utils/phoneCountries';

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
}

/** Flag + dial code button that opens a country list. Shared by every phone field. */
export function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = findPhoneCountry(value) ?? PHONE_COUNTRIES[0];

  return (
    <View>
      <TouchableOpacity style={s.button} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
        <Text style={s.buttonText}>{selected.flag} {selected.code}</Text>
        <ChevronDown size={12} color={Colors.text.tertiary} />
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select country code</Text>
            <FlatList
              data={PHONE_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetItem, item.code === value && s.sheetItemActive]}
                  onPress={() => { onChange(item.code); setPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.sheetItemName}>{item.flag}  {item.name}</Text>
                  <Text style={s.sheetItemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  buttonText: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '500' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sheetItemActive: { backgroundColor: Colors.primaryLight },
  sheetItemName: { fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  sheetItemCode: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
