import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface DraftBannerProps {
  onContinue: () => void;
  onStartFresh: () => void;
}

export function DraftBanner({ onContinue, onStartFresh }: DraftBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You have an unfinished booking. Continue where you left off?
      </Text>
      <View style={styles.btns}>
        <TouchableOpacity onPress={onContinue} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onStartFresh} style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>Start fresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(39,110,241,0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(39,110,241,0.2)',
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  btns: { flexDirection: 'row', gap: Spacing.sm },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  btnGhostText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
});
