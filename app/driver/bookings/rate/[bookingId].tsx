import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useRatingForm } from '@/app/driver/rate/hooks/useRatingForm';
import { RatingForm } from '@/app/driver/rate/components/RatingForm';

export default function RateSenderScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { session } = useAuthStore();

  if (!bookingId || !session) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid booking or session</Text>
      </SafeAreaView>
    );
  }

  const { score, setScore, comment, setComment, isLoading, error, handleSubmit } = useRatingForm({
    bookingId,
    driverId: session.user.id,
    onSuccess: () => {
      Alert.alert('Thank you!', 'Your rating has been submitted.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {}} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Sender</Text>
      </View>

      <RatingForm
        score={score}
        onScoreChange={setScore}
        comment={comment}
        onCommentChange={setComment}
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmit}
        title="How was your experience?"
        subtitle="Your feedback helps maintain a positive community."
        submitLabel="Submit Rating"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  errorText: {
    fontSize: FontSize.base,
    color: Colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
});
