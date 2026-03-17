import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { signUpSchema, type SignUpData } from '@/utils/validators';
import { getAuthErrorMessage } from '@/utils/errorMessages';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  const { showToast } = useUIStore();

  const { control, handleSubmit, formState: { errors } } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpData) => {
    try {
      await signUp(data.email, data.password, data.fullName);
      router.push({ pathname: '/(auth)/verify-otp', params: { email: data.email } });
    } catch (error) {
      const msg = (error as { message?: string }).message ?? '';
      if (msg.includes('User already registered')) {
        showToast('An account with this email already exists.', 'error');
        router.push('/(auth)/login');
        return;
      }
      showToast(getAuthErrorMessage(error), 'error');
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join thousands of expats shipping to Tunisia</Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full name"
              placeholder="Youssef Ben Salem"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.fullName?.message}
              autoCapitalize="words"
            />
          )}
        />

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

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="8+ characters"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.password?.message}
              secureTextEntry
            />
          )}
        />

        <Button
          label="Create Account"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          size="lg"
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },
  container: { padding: Spacing['2xl'], flexGrow: 1 },
  title: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing['2xl'] },
  button: { marginTop: Spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
  footerText: { fontSize: FontSize.base, color: Colors.text.secondary },
  link: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
});
