import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StarRating } from './StarRating';

interface RatingFormProps {
  score: number;
  onScoreChange: (score: number) => void;
  comment: string;
  onCommentChange: (text: string) => void;
  isLoading: boolean;
  error?: string | null;
  onSubmit: () => void;
  title: string;
  subtitle: string;
  submitLabel?: string;
}

export function RatingForm({
  score,
  onScoreChange,
  comment,
  onCommentChange,
  isLoading,
  error,
  onSubmit,
  title,
  subtitle,
  submitLabel = 'Submit Rating',
}: RatingFormProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <StarRating score={score} onScoreChange={onScoreChange} />

      <TextInput
        style={styles.commentInput}
        placeholder="Share your experience (optional)"
        placeholderTextColor={Colors.text.tertiary}
        value={comment}
        onChangeText={onCommentChange}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!isLoading}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.submitBtnText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { padding: Spacing['2xl'] },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing['2xl'],
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    minHeight: 100,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
  },
});
