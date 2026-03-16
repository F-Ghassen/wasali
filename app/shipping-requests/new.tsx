import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EU_ORIGIN_CITIES, TN_DESTINATION_CITIES } from '@/constants/cities';
import { PACKAGE_CATEGORIES } from '@/constants/packageCategories';
import { useRequestStore } from '@/stores/requestStore';
import { useAuthStore } from '@/stores/authStore';

export default function NewRequestScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { draft, setDraftField, submitRequest, isLoading } = useRequestStore();

  const handleSubmit = async () => {
    if (!session) return;
    if (!draft.originCity || !draft.destinationCity || !draft.packageWeightKg || !draft.packageCategory) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    try {
      const requestId = await submitRequest(session.user.id);
      router.replace(`/shipping-requests/${requestId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Shipping Request</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>
            Post your shipping needs and let drivers offer you their best prices.
          </Text>

          <Input
            label="From City *"
            placeholder="e.g. Paris"
            value={draft.originCity ?? ''}
            onChangeText={(v) => {
              setDraftField('originCity', v);
              const city = EU_ORIGIN_CITIES.find(c => c.name.toLowerCase() === v.toLowerCase());
              if (city) setDraftField('originCountry', city.country);
            }}
          />

          <Input
            label="To City *"
            placeholder="e.g. Tunis"
            value={draft.destinationCity ?? ''}
            onChangeText={(v) => {
              setDraftField('destinationCity', v);
              const city = TN_DESTINATION_CITIES.find(c => c.name.toLowerCase() === v.toLowerCase());
              if (city) setDraftField('destinationCountry', city.country);
            }}
          />

          <Input
            label="Package Weight (kg) *"
            placeholder="e.g. 5"
            value={draft.packageWeightKg?.toString() ?? ''}
            onChangeText={(v) => setDraftField('packageWeightKg', parseFloat(v) || 0)}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {PACKAGE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryItem, draft.packageCategory === cat.id && styles.categorySelected]}
                onPress={() => setDraftField('packageCategory', cat.id)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, draft.packageCategory === cat.id && styles.catLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Maximum Budget (€) — optional"
            placeholder="e.g. 50"
            value={draft.maxBudgetEur?.toString() ?? ''}
            onChangeText={(v) => setDraftField('maxBudgetEur', parseFloat(v) || null)}
            keyboardType="decimal-pad"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button label="Post Request" onPress={handleSubmit} isLoading={isLoading} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
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
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing.xl, lineHeight: 22 },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.primary, marginBottom: Spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  categoryItem: {
    width: '47%',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categorySelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  catIcon: { fontSize: 24 },
  catLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },
  catLabelSelected: { color: Colors.primary },
  footer: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.light },
});
