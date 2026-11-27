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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
import { useContacts } from '@/hooks/useContacts';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { toContactFormValues, toContactInput } from '@/utils/contacts';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/utils/phoneCountries';
import { contactSchema, type ContactFormData } from '@/utils/validators';
import { CountryCodeSelect } from '@/components/shared/ui/forms/CountryCodeSelect';

export default function ContactEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { contacts, isLoading, editContact } = useContacts(userId);

  const contact = contacts.find((c) => c.id === id);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      countryCode: DEFAULT_PHONE_COUNTRY_CODE,
      phoneNumber: '',
      whatsappEnabled: false,
      street: '',
      city: '',
      postalCode: '',
    },
  });

  // Prefill once the contact is in the list.
  useEffect(() => {
    if (contact) reset(toContactFormValues(contact));
  }, [contact, reset]);

  const onSave = async (data: ContactFormData) => {
    try {
      await editContact(id, toContactInput(data));
      showToast('Contact updated', 'success');
      router.back();
    } catch {
      showToast('Could not save the contact. Please try again.', 'error');
    }
  };

  if (!isLoading && !contact) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>This contact no longer exists.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Contact</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Name *" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.name?.message} />
          )} />
          <Text style={styles.sectionTitle}>Phone *</Text>
          <View style={styles.phoneRow}>
            <Controller control={control} name="countryCode" render={({ field: { onChange, value } }) => (
              <CountryCodeSelect value={value} onChange={onChange} />
            )} />
            <View style={styles.flex}>
              <Controller control={control} name="phoneNumber" render={({ field: { onChange, onBlur, value } }) => (
                <Input placeholder="20 123 456" keyboardType="phone-pad" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.phoneNumber?.message ?? errors.countryCode?.message} />
              )} />
            </View>
          </View>
          <Controller control={control} name="whatsappEnabled" render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Reachable on WhatsApp</Text>
              <Switch value={value} onValueChange={onChange} />
            </View>
          )} />

          <Text style={styles.sectionTitle}>Address (optional)</Text>
          <Controller control={control} name="street" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Street" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} error={errors.street?.message} />
          )} />
          <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="City" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} />
          )} />
          <Controller control={control} name="postalCode" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Postal Code" onChangeText={onChange} onBlur={onBlur} value={value ?? ''} />
          )} />

          <Button label="Save Contact" onPress={handleSubmit(onSave)} isLoading={isSubmitting} disabled={!isDirty} size="lg" />
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  switchLabel: { fontSize: FontSize.base, color: Colors.text.primary },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary, marginVertical: Spacing.sm },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.base },
  notFound: { padding: Spacing.base, fontSize: FontSize.base, color: Colors.text.secondary },
});
