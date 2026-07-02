import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
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
    defaultValues: { email: '', password: '' },
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
        {/* Brand header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue shipping</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email address"
                placeholder="you@example.com"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon={<Text style={styles.fieldIcon}>✉️</Text>}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoComplete="password"
                leftIcon={<Text style={styles.fieldIcon}>🔒</Text>}
                rightIcon={
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            )}
          />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password' as any)}
            style={styles.forgotWrapper}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Driver CTA */}
        <TouchableOpacity
          style={styles.driverCard}
          onPress={() => router.push('/(auth)/sign-up-driver' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.driverEmoji}>🚚</Text>
          <View style={styles.driverTextBlock}>
            <Text style={styles.driverCardTitle}>Are you a driver?</Text>
            <Text style={styles.driverCardSub}>Register as a driver carrier</Text>
          </View>
          <Text style={styles.driverArrow}>›</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Wasali? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up' as any)}>
            <Text style={styles.link}>Create an account</Text>
          </TouchableOpacity>
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>🔐</Text>
            <Text style={styles.trustText}>Secure</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>🌍</Text>
            <Text style={styles.trustText}>EU → TN</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>⚡</Text>
            <Text style={styles.trustText}>Fast</Text>
          </View>
        </View>
        </View>{/* /inner */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background.primary },

  container: {
    flexGrow: 1,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: Spacing.xl,
  },

  // Header / brand
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  logo: {
    width: 52,
    height: 52,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Form card
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    // subtle shadow
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  fieldIcon: { fontSize: 16 },
  eyeIcon: { fontSize: 18 },

  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  forgot: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: '600',
  },

  button: { marginTop: 0 },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    marginHorizontal: Spacing.base,
    fontWeight: '500',
  },

  // Driver CTA
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  driverEmoji: { fontSize: 28, marginRight: Spacing.base },
  driverTextBlock: { flex: 1 },
  driverCardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  driverCardSub: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  driverArrow: {
    fontSize: 24,
    color: Colors.text.tertiary,
    fontWeight: '300',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  footerText: { fontSize: FontSize.base, color: Colors.text.secondary },
  link: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Trust badges
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustIcon: { fontSize: 13 },
  trustText: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border.medium,
  },
});
