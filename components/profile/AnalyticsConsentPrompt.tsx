import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface AnalyticsConsentPromptProps {
  onAccept: () => void;
  onDismiss: () => void;
  isSaving?: boolean;
}

/** Asks for analytics opt-in on the profile hub. Dismissing hides it until the next app start. */
export function AnalyticsConsentPrompt({ onAccept, onDismiss, isSaving }: AnalyticsConsentPromptProps) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Help us improve Wasali</Text>
      <Text style={s.body}>
        Allow anonymous usage analytics so we can see which parts of the app work well. You can change this any time in Privacy.
      </Text>
      <View style={s.actions}>
        <TouchableOpacity style={s.secondary} onPress={onDismiss} disabled={isSaving} activeOpacity={0.7}>
          <Text style={s.secondaryText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.primary, isSaving && s.disabled]} onPress={onAccept} disabled={isSaving} activeOpacity={0.7}>
          <Text style={s.primaryText}>Allow</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  body: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  secondary: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  secondaryText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600' },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  primaryText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
