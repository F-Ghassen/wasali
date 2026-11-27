import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface AddressBookCardProps {
  title: string;
  subtitle: string;
  detail?: string | null;
  badges: string[];
  onSetDefault?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One entry in the Address Book, either a place or a person. */
export function AddressBookCard({
  title,
  subtitle,
  detail,
  badges,
  onSetDefault,
  onEdit,
  onDelete,
}: AddressBookCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {badges.map((badge) => (
          <View key={badge} style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { flexShrink: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  badge: {
    marginLeft: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
  detail: { fontSize: FontSize.sm, color: Colors.text.tertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.sm },
  action: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  destructive: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
});
