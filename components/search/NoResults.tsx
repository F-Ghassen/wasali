import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface Props {
  fromCity: string;
  toCity: string;
  hasFilters: boolean;
  onShowAll: () => void;
  onSetAlert: () => void;
}

export function NoResults({ fromCity, toCity, hasFilters, onShowAll, onSetAlert }: Props) {
  return (
    <View style={s.root}>
      <Text style={s.emoji}>🚛</Text>
      <Text style={s.title}>No matching routes found</Text>
      <Text style={s.desc}>
        {hasFilters
          ? `No routes match your current filters for ${fromCity} → ${toCity}.`
          : `No drivers are currently scheduled from ${fromCity} to ${toCity}.`}
      </Text>

      {hasFilters && (
        <TouchableOpacity style={s.secondaryBtn} onPress={onShowAll} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>Clear filters</Text>
        </TouchableOpacity>
      )}

      <View style={s.alertCard}>
        <View style={s.alertCardTop}>
          <Bell size={22} color={Colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertCardTitle}>Get notified when a route opens</Text>
            <Text style={s.alertCardDesc}>
              Be the first to know when a driver publishes a route on this corridor.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.alertBtn} onPress={onSetAlert} activeOpacity={0.85}>
          <Text style={s.alertBtnText}>Set up alert →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
  },
  emoji: { fontSize: 52, marginBottom: Spacing.base },
  title: {
    fontSize: FontSize.xl, fontWeight: '800',
    color: Colors.text.primary, textAlign: 'center', marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
  secondaryBtn: {
    borderWidth: 1, borderColor: Colors.border.light, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl,
  },
  secondaryBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },
  alertCard: {
    width: '100%', backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.base, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border.light,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  alertCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  alertCardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginBottom: 3 },
  alertCardDesc: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  alertBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  alertBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
