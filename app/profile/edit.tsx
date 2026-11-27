import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
import { CountryCodeSelect } from '@/components/shared/ui/forms/CountryCodeSelect';
import { CountryChipPicker } from '@/components/profile/CountryChipPicker';
import { useAuthStore } from '@/stores/authStore';
import { toProfileFormValues, toProfileUpdate } from '@/utils/profileForm';
import { profileSchema, type ProfileFormData } from '@/utils/validators';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, isLoading } = useAuthStore();

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: toProfileFormValues(profile),
  });

  // The profile may still be loading when the screen mounts.
  useEffect(() => {
    if (profile) reset(toProfileFormValues(profile));
  }, [profile, reset]);

  const onSave = async (data: ProfileFormData) => {
    try {
      await updateProfile(toProfileUpdate(data));
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Full Name" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words" error={errors.fullName?.message} />
            )}
          />

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <Controller
              control={control}
              name="countryCode"
              render={({ field: { onChange, value } }) => (
                <CountryCodeSelect value={value} onChange={onChange} />
              )}
            />
            <View style={styles.flex}>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" placeholder="6 12 34 56 78" error={errors.phoneNumber?.message ?? errors.countryCode?.message} />
                )}
              />
            </View>
          </View>

          <Text style={styles.label}>Country of residence</Text>
          <Controller
            control={control}
            name="countryIso"
            render={({ field: { onChange, value } }) => (
              <CountryChipPicker value={value} onChange={onChange} error={errors.countryIso?.message} />
            )}
          />
          <View style={styles.spacer} />

          <Button label="Save Changes" onPress={handleSubmit(onSave)} isLoading={isLoading} disabled={!isDirty} size="lg" />
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
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.xs },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.base },
  spacer: { height: Spacing.base },
});
