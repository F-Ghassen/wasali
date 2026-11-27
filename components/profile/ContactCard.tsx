import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { ContactRow } from '@/types/contacts';

interface ContactCardProps {
  contact: ContactRow;
  onEdit: (contactId: string) => void;
  onDelete: (contactId: string) => void;
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const addressLine = contact.address
    ? [contact.address.street, contact.address.postal_code, contact.address.city].filter(Boolean).join(', ')
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{contact.name}</Text>
        {contact.whatsapp_enabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>WhatsApp</Text>
          </View>
        )}
      </View>
      <Text style={styles.phone}>{contact.phone}</Text>
      {addressLine && <Text style={styles.address}>{addressLine}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onEdit(contact.id)} accessibilityRole="button">
          <Text style={styles.action}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(contact.id)} accessibilityRole="button">
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
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  badge: { backgroundColor: Colors.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  phone: { fontSize: FontSize.sm, color: Colors.text.secondary },
  address: { fontSize: FontSize.sm, color: Colors.text.tertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.sm },
  action: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  destructive: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
});
