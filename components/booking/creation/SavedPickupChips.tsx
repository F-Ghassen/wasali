import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { SavedAddress } from '@/types/models';

interface SavedPickupChipsProps {
  addresses: SavedAddress[];
  selectedStreet: string;
  onSelect: (address: SavedAddress) => void;
}

/** One-tap choice of a saved address for the pickup. The highlighted chip matches the current street. */
export function SavedPickupChips({ addresses, selectedStreet, onSelect }: SavedPickupChipsProps) {
  if (addresses.length === 0) return null;

  return (
    <View style={styles.row}>
      {addresses.map((address) => {
        const isSelected = address.street === selectedStreet;
        return (
          <TouchableOpacity
            key={address.id}
            onPress={() => onSelect(address)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{address.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  label: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600' },
  labelSelected: { color: Colors.primary },
});
