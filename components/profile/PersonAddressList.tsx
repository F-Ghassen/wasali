import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { PersonAddress } from '@/types/contacts';
import { formatAddress } from '@/utils/addressFormat';

interface PersonAddressListProps {
  addresses: PersonAddress[];
  onAdd: () => void;
  onEditAddress: (addressId: string) => void;
  onSetDefaultAddress: (addressId: string) => void;
  onDeleteAddress: (addressId: string) => void;
}

/** A person's addresses, with their actions and an add button. Shared by the card and the person form. */
export function PersonAddressList({
  addresses,
  onAdd,
  onEditAddress,
  onSetDefaultAddress,
  onDeleteAddress,
}: PersonAddressListProps) {
  return (
    <View style={styles.list}>
      {addresses.length === 0 ? (
        <Text style={styles.empty}>No address yet</Text>
      ) : (
        addresses.map((address) => (
          <AddressRow
            key={address.id}
            address={address}
            onEdit={() => onEditAddress(address.id)}
            onSetDefault={address.is_default ? undefined : () => onSetDefaultAddress(address.id)}
            onDelete={() => onDeleteAddress(address.id)}
          />
        ))
      )}
      <TouchableOpacity onPress={onAdd} accessibilityRole="button">
        <Text style={styles.action}>+ Add address</Text>
      </TouchableOpacity>
    </View>
  );
}

interface AddressRowProps {
  address: PersonAddress;
  onEdit: () => void;
  onSetDefault?: () => void;
  onDelete: () => void;
}

function AddressRow({ address, onEdit, onSetDefault, onDelete }: AddressRowProps) {
  return (
    <View style={styles.addressRow}>
      <View style={styles.row}>
        <Text style={styles.addressTitle}>{address.label || formatAddress(address)}</Text>
        {address.is_default && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Default</Text>
          </View>
        )}
      </View>
      {address.label ? <Text style={styles.detail}>{formatAddress(address)}</Text> : null}
      <View style={styles.actions}>
        {onSetDefault && (
          <TouchableOpacity onPress={onSetDefault} accessibilityRole="button">
            <Text style={styles.action}>Set as default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onEdit} accessibilityRole="button">
          <Text style={styles.action}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} accessibilityRole="button">
          <Text style={styles.destructive}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: Spacing.sm, gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addressRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
  },
  addressTitle: { flexShrink: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  detail: { fontSize: FontSize.sm, color: Colors.text.tertiary, marginTop: 2 },
  empty: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  badge: {
    marginLeft: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  actions: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.sm },
  action: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  destructive: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
});
