import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { getAuthErrorMessage } from '@/utils/errorMessages';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { showToast } = useUIStore();
  const { loadProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetData) => {
    setIsLoading(true);
    try {
      const { data: updateData, error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      showToast('Password updated successfully', 'success');
      if (updateData.user) await loadProfile(updateData.user.id);
      const { profile } = useAuthStore.getState();
      router.replace(profile?.role === 'driver' ? '/(driver-tabs)' as any : '/(tabs)');
    } catch (error) {
      const msg = (error as { message?: string }).message ?? '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        showToast('Reset link has expired. Please request a new one.', 'error');
        router.replace('/(auth)/forgot-password');
        return;
      }
      showToast(getAuthErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password for your account.
        </Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="New password"
              placeholder="8+ characters"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.password?.message}
              secureTextEntry
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm password"
              placeholder="Repeat new password"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmPassword?.message}
              secureTextEntry
            />
          )}
        />

        <Button
          label="Update Password"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          size="lg"
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },
  container: { padding: Spacing['2xl'], flexGrow: 1 },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing['2xl'],
    lineHeight: 24,
  },
  button: { marginTop: Spacing.md },
});
