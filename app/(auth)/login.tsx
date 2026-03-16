import React, { useState } from 'react';
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
import { loginSchema, type LoginData } from '@/utils/validators';
import { getAuthErrorMessage } from '@/utils/errorMessages';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const { showToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await signIn(data.email, data.password);
      // navigation handled by SIGNED_IN event in _layout.tsx
    } catch (error) {
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your Wasali account</Text>

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
              placeholder="Your password"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.password?.message}
              secureTextEntry={!showPassword}
              rightIcon={<Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
          )}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotWrapper}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          label="Sign In"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          size="lg"
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.link}>Sign up</Text>
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
  eyeIcon: { fontSize: 18 },
  forgotWrapper: { alignSelf: 'flex-end', marginBottom: Spacing.md },
  forgot: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '500' },
  button: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
  footerText: { fontSize: FontSize.base, color: Colors.text.secondary },
  link: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
});
