import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const DISPUTE_REASONS = [
  'Package not delivered',
  'Package damaged',
  'Wrong items delivered',
  'Late delivery',
  'Other',
];

export default function RaiseDisputeScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { session } = useAuthStore();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!session || !bookingId) return;
    if (!reason) { Alert.alert('Required', 'Please select a reason'); return; }
    if (description.length < 20) { Alert.alert('Required', 'Please provide more detail (at least 20 characters)'); return; }

    setIsLoading(true);
    try {
      await supabase.from('disputes').insert({
        booking_id: bookingId,
        sender_id: session.user.id,
        reason,
        description,
        status: 'open',
      });

      Alert.alert('Dispute Filed', 'Our team will review your dispute within 48 hours.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/bookings') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to file dispute. Please try again.');
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
        <Text style={styles.headerTitle}>Report a Problem</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What went wrong?</Text>
        <Text style={styles.subtitle}>We'll investigate and help resolve the issue.</Text>

        <Text style={styles.label}>Reason *</Text>
        <View style={styles.reasons}>
          {DISPUTE_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonItem, reason === r && styles.reasonSelected]}
              onPress={() => setReason(r)}
            >
              <Text style={[styles.reasonText, reason === r && styles.reasonTextSelected]}>{r}</Text>
              {reason === r && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Please describe what happened in detail..."
          placeholderTextColor={Colors.text.tertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length} / 500</Text>

        <Button label="Submit Dispute" onPress={handleSubmit} isLoading={isLoading} size="lg" />
      </ScrollView>
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
  content: { padding: Spacing.base },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing['2xl'] },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.primary, marginBottom: Spacing.sm },
  reasons: { gap: Spacing.sm, marginBottom: Spacing.xl },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
  },
  reasonSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  reasonText: { fontSize: FontSize.base, color: Colors.text.primary },
  reasonTextSelected: { color: Colors.primary, fontWeight: '600' },
  check: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    minHeight: 120,
    marginBottom: Spacing.xs,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.text.tertiary, textAlign: 'right', marginBottom: Spacing.xl },
});
