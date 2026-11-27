import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatAddress } from '@/utils/addressFormat';
import type { SavedAddress } from '@/types/models';

interface AddressCardProps {
  address: SavedAddress;
  onSetDefault: (addressId: string) => void;
  onEdit: (addressId: string) => void;
  onDelete: (addressId: string) => void;
}

export function AddressCard({ address, onSetDefault, onEdit, onDelete }: AddressCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{address.label}</Text>
        {address.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      <Text style={styles.address}>{formatAddress(address)}</Text>
      <Text style={styles.country}>{address.country}</Text>

      <View style={styles.actions}>
        {!address.is_default && (
          <TouchableOpacity onPress={() => onSetDefault(address.id)} accessibilityRole="button">
            <Text style={styles.action}>Set as default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onEdit(address.id)} accessibilityRole="button">
          <Text style={styles.action}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(address.id)} accessibilityRole="button">
          <Text style={styles.destructive}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  defaultBadge: { backgroundColor: Colors.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  address: { fontSize: FontSize.sm, color: Colors.text.secondary },
  country: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  actions: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.sm },
  action: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  destructive: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
});
