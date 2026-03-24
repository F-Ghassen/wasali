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
import type { RatingFormProps } from '../types';

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
  isExistingRating,
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

      {isExistingRating && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>✓ Rating already submitted</Text>
          <Text style={styles.feedbackSubtext}>You can update your rating below</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          isLoading && styles.submitBtnDisabled,
        ]}
        onPress={onSubmit}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.submitBtnText}>
            {isExistingRating ? 'Update Rating' : submitLabel}
          </Text>
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
  feedbackContainer: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  feedbackText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  feedbackSubtext: {
    fontSize: FontSize.sm,
    color: Colors.success,
    opacity: 0.8,
  },
});
