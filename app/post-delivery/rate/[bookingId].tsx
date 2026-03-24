import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function RateDriverScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { session } = useAuthStore();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!session || !bookingId) return;
    setIsLoading(true);
    try {
      // Get booking to get driver_id
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, route:routes(driver_id)')
        .eq('id', bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');

      const driverId = ((booking as any).route as any)?.driver_id;

      // Check if rating already exists
      const { data: existingRating, error: checkError } = await supabase
        .from('ratings')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is fine
        throw checkError;
      }

      if (existingRating) {
        // Update existing rating
        await supabase
          .from('ratings')
          .update({
            score,
            comment: comment.trim() || null,
          })
          .eq('booking_id', bookingId);
      } else {
        // Insert new rating
        await supabase.from('ratings').insert({
          booking_id: bookingId,
          sender_id: session.user.id,
          driver_id: driverId,
          score,
          comment: comment.trim() || null,
        });
      }

      Alert.alert('Thank you!', 'Your rating has been submitted.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/bookings') },
      ]);
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Driver</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>How was your experience?</Text>
        <Text style={styles.subtitle}>Your feedback helps other senders make better choices.</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setScore(s)} style={styles.star}>
              <Text style={[styles.starText, s <= score && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.scoreLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][score]}
        </Text>

        <TextInput
          style={styles.commentInput}
          placeholder="Share your experience (optional)"
          placeholderTextColor={Colors.text.tertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Button label="Submit Rating" onPress={handleSubmit} isLoading={isLoading} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
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
  content: { padding: Spacing['2xl'] },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing['2xl'] },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  star: { padding: Spacing.sm },
  starText: { fontSize: 40, color: Colors.border.medium },
  starActive: { color: Colors.secondary },
  scoreLabel: {
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
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
    marginBottom: Spacing.xl,
  },
});
