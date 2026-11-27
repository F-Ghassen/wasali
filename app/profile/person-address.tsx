import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
import { AddressFieldGroup } from '@/components/shared/ui/forms/AddressFieldGroup';
import { useAddressBook } from '@/hooks/useAddressBook';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import {
  addressBookResolver,
  emptyAddressBookValues,
  placeToFormValues,
  toPlaceData,
  type AddressBookFormValues,
} from '@/utils/addressBookForm';

/**
 * Adds or edits one of a person's addresses. Reached from the person card, so
 * the person is fixed by `personId`. The address uses the place schema: the
 * label is optional, the street, city and country are required.
 */
export default function PersonAddressScreen() {
  const router = useRouter();
  const { personId, id } = useLocalSearchParams<{ personId: string; id?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { people, isLoading, savePersonAddress } = useAddressBook(userId);

  const person = people.find((p) => p.id === personId);
  const address = id ? person?.addresses.find((a) => a.id === id) : undefined;
  const isEditing = Boolean(id);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AddressBookFormValues>({
    resolver: addressBookResolver,
    defaultValues: emptyAddressBookValues('place'),
  });

  useEffect(() => {
    if (address) reset(placeToFormValues(address));
  }, [address, reset]);

  const onSave = async (values: AddressBookFormValues) => {
    if (!personId) return;
    try {
      await savePersonAddress(personId, toPlaceData(values), id);
      showToast(isEditing ? 'Updated' : 'Saved', 'success');
      router.back();
    } catch {
      showToast('Could not save. Please try again.', 'error');
    }
  };

  if (!isLoading && (!person || (isEditing && !address))) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>This address no longer exists.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Address' : 'New Address'}</Text>
          <Text style={styles.headerSubtitle}>{person?.name}</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Controller control={control} name="label" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Label" placeholder="Home, Work (optional)" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.label?.message} />
          )} />
          <AddressFieldGroup control={control} watch={watch} setValue={setValue} errors={errors} />

          <Button
            label={isEditing ? 'Save Changes' : 'Save'}
            onPress={handleSubmit(onSave)}
            isLoading={isSubmitting}
            disabled={isEditing && !isDirty}
            size="lg"
          />
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
  headerSubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
  content: { padding: Spacing.base },
  notFound: { padding: Spacing.base, fontSize: FontSize.base, color: Colors.text.secondary },
});
