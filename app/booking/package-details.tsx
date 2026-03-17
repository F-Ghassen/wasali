import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { useBookingStore } from '@/stores/bookingStore';
import { PACKAGE_CATEGORIES } from '@/constants/packageCategories';
import { packageDetailsSchema, type PackageDetailsData } from '@/utils/validators';

export default function PackageDetailsScreen() {
  const router = useRouter();
  const { draft, setPackageDetails, setStep } = useBookingStore();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PackageDetailsData>({
    resolver: zodResolver(packageDetailsSchema),
    defaultValues: {
      weight: draft.packageWeightKg || 1,
      category: draft.packageCategory || '',
    },
  });

  const selectedCategory = watch('category');

  const onNext = (data: PackageDetailsData) => {
    setPackageDetails({
      packageWeightKg: data.weight,
      packageCategory: data.category,
      declaredValueEur: data.declaredValue ?? null,
      notes: data.notes ?? '',
    });
    setStep(2);
    router.push('/booking/logistics');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stepHeader}>
        <StepIndicator
          currentStep={1}
          totalSteps={3}
          labels={['Package', 'Logistics', 'Payment']}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Package Details</Text>

          <Controller
            control={control}
            name="weight"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Weight (kg)"
                placeholder="e.g. 5"
                onChangeText={(v) => onChange(parseFloat(v) || 0)}
                onBlur={onBlur}
                value={value?.toString() ?? ''}
                error={errors.weight?.message}
                keyboardType="decimal-pad"
              />
            )}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {PACKAGE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryItem, selectedCategory === cat.id && styles.categorySelected]}
                onPress={() => setValue('category', cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.category && <Text style={styles.error}>{errors.category.message}</Text>}

          <Controller
            control={control}
            name="declaredValue"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Declared Value (€) — optional"
                placeholder="e.g. 200"
                onChangeText={(v) => onChange(parseFloat(v) || undefined)}
                onBlur={onBlur}
                value={value?.toString() ?? ''}
                keyboardType="decimal-pad"
              />
            )}
          />

          <Text style={styles.label}>Notes — optional</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.textarea}
                placeholder="e.g. Fragile items, handle with care"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.text.tertiary}
              />
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button label="Next: Logistics" onPress={handleSubmit(onNext)} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  stepHeader: { paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  content: { padding: Spacing.base },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.xl },
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
    backgroundColor: Colors.white,
  },
  categorySelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  categoryIcon: { fontSize: 28 },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },
  categoryLabelSelected: { color: Colors.primary },
  error: { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.base },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  footer: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.light },
});
