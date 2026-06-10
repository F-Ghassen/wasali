import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RouteRestrictionsSectionProps {
  items: string[];
  onContact?: () => void;
}

export function RouteRestrictionsSection({ items, onContact }: RouteRestrictionsSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <AlertTriangle size={16} color={Colors.error} strokeWidth={2} />
        <Text style={s.title}>Prohibited Items</Text>
      </View>

      <View style={s.itemsList}>
        {items.map((item, idx) => (
          <View key={idx} style={s.itemRow}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.itemText}>{item}</Text>
          </View>
        ))}
      </View>

      {onContact && (
        <TouchableOpacity style={s.contactCTA} onPress={onContact}>
          <MessageCircle size={14} color={Colors.primary} strokeWidth={2} />
          <Text style={s.contactText}>Contact driver for exceptions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.15)',
    gap: Spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.error,
  },

  itemsList: {
    gap: Spacing.sm,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },

  bullet: {
    fontSize: FontSize.base,
    color: Colors.error,
    fontWeight: '600',
  },

  itemText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },

  contactCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  contactText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
