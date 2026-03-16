import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { savedAddressSchema, type SavedAddressData } from '@/utils/validators';

export default function AddAddressScreen() {
  const router = useRouter();
  const { session } = useAuthStore();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SavedAddressData>({
    resolver: zodResolver(savedAddressSchema),
  });

  const onSave = async (data: SavedAddressData) => {
    if (!session) return;
    try {
      const { error } = await supabase.from('saved_addresses').insert({
        user_id: session.user.id,
        label: data.label,
        street: data.street,
        city: data.city,
        country: data.country,
        postal_code: data.postalCode ?? null,
        is_default: false,
      });
      if (error) throw error;
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save address. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Address</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Controller control={control} name="label" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Label *" placeholder="e.g. Home, Mom's place" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.label?.message} />
          )} />
          <Controller control={control} name="street" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Street Address *" placeholder="123 Rue de la Paix" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.street?.message} />
          )} />
          <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="City *" placeholder="Paris" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.city?.message} />
          )} />
          <Controller control={control} name="country" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Country *" placeholder="France" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.country?.message} />
          )} />
          <Controller control={control} name="postalCode" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Postal Code" placeholder="75001" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} keyboardType="number-pad" />
          )} />
          <Button label="Save Address" onPress={handleSubmit(onSave)} isLoading={isSubmitting} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
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
});
