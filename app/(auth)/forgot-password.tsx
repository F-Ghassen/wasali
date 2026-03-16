import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { getAuthErrorMessage } from '@/utils/errorMessages';

const schema = z.object({ email: z.string().email('Invalid email') });
type ForgotData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();
  const { showToast } = useUIStore();

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotData) => {
    try {
      await resetPassword(data.email);
      showToast('Password reset link sent — check your inbox', 'success');
      router.back();
    } catch (error) {
      showToast(getAuthErrorMessage(error), 'error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.email?.message}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />

      <Button
        label="Send Reset Link"
        onPress={handleSubmit(onSubmit)}
        isLoading={isLoading}
        size="lg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing['2xl'],
  },
  title: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing['2xl'], lineHeight: 24 },
});
