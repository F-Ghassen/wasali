import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { EMPTY_ADDRESS_FORM, toAddressFormValues } from '@/utils/addressForm';
import { savedAddressSchema, type SavedAddressData } from '@/utils/validators';

export default function AddAddressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const addressId = typeof id === 'string' ? id : undefined;
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { addresses, saveAddress } = useSavedAddresses(userId);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SavedAddressData>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: EMPTY_ADDRESS_FORM,
  });

  // Edit mode: prefill once the address is in the list.
  const existing = addressId ? addresses.find((a) => a.id === addressId) : undefined;
  useEffect(() => {
    if (existing) reset(toAddressFormValues(existing));
  }, [existing, reset]);

  const onSave = async (data: SavedAddressData) => {
    try {
      await saveAddress(data, addressId);
      showToast(addressId ? 'Address updated' : 'Address saved', 'success');
      router.back();
    } catch {
      showToast('Could not save the address. Please try again.', 'error');
    }
  };

  const title = addressId ? 'Edit Address' : 'Add Address';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
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
            <Input label="Postal Code" placeholder="75001" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} autoCapitalize="characters" />
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
