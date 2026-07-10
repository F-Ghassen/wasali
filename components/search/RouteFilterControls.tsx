import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface Props {
  minCapInput: string;
  maxPriceInput: string;
  onMinCapChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
  activeFilterCount: number;
  onReset: () => void;
  /** 'row' = mobile panel side-by-side; 'column' = wide sidebar stacked */
  layout?: 'row' | 'column';
}

export function RouteFilterControls({
  minCapInput, maxPriceInput,
  onMinCapChange, onMaxPriceChange,
  activeFilterCount, onReset,
  layout = 'column',
}: Props) {
  const isRow = layout === 'row';

  return (
    <View style={isRow ? s.row : s.column}>
      <View style={isRow ? s.group : undefined}>
        <Text style={s.label}>MIN CAPACITY ACCEPTED BY DRIVER</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="0"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="decimal-pad"
            value={minCapInput}
            onChangeText={onMinCapChange}
          />
          <Text style={s.unit}>kg</Text>
        </View>
      </View>

      <View style={[isRow ? s.group : undefined, !isRow && { marginTop: Spacing.sm }]}>
        <Text style={s.label}>MAX PRICE PER KILO</Text>
        <View style={s.inputWrap}>
          <Text style={s.unit}>€</Text>
          <TextInput
            style={s.input}
            placeholder="any"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="decimal-pad"
            value={maxPriceInput}
            onChangeText={onMaxPriceChange}
          />
          <Text style={s.unit}>/kg</Text>
        </View>
      </View>

      {activeFilterCount > 0 && (
        <TouchableOpacity style={s.resetBtn} onPress={onReset} activeOpacity={0.7}>
          <Text style={s.resetText}>Reset filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row:    { flexDirection: 'row', gap: Spacing.base },
  column: {},
  group:  { flex: 1, gap: 4 },
  label: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1,
    color: Colors.text.tertiary, marginBottom: 2,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm, height: 44,
  },
  input: {
    flex: 1, fontSize: FontSize.base, color: Colors.text.primary, paddingVertical: 0,
    ...Platform.select({ web: { outlineWidth: 0 } as any }),
  },
  unit: { fontSize: FontSize.sm, color: Colors.text.tertiary, fontWeight: '500' },
  resetBtn: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  resetText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
});
