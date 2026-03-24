import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { StarRatingProps } from '../types';

const SCORE_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export function StarRating({ score, onScoreChange, maxStars = 5 }: StarRatingProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onScoreChange(s)}
            style={styles.star}
            activeOpacity={0.7}
          >
            <Text style={[styles.starText, s <= score && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.scoreLabel}>{SCORE_LABELS[score] || ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing['2xl'] },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  star: { padding: Spacing.sm },
  starText: { fontSize: 40, color: Colors.border.medium },
  starActive: { color: Colors.secondary },
  scoreLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});
