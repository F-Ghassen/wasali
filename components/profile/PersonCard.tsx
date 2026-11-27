import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { ContactRow } from '@/types/contacts';

interface PersonCardProps {
  person: ContactRow;
  onEdit: () => void;
  onDelete: () => void;
}

/** A person in the Address Book. Their addresses are managed in Edit person. */
export function PersonCard({ person, onEdit, onDelete }: PersonCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{person.name}</Text>
        {person.whatsapp_enabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>WhatsApp</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>{person.phone}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} accessibilityRole="button">
          <Text style={styles.action}>Edit person</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} accessibilityRole="button">
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
  title: { flexShrink: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
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
