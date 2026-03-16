import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { getAuthErrorMessage } from '@/utils/errorMessages';

const RESEND_COOLDOWN = 60;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendVerification, isLoading } = useAuthStore();
  const { showToast } = useUIStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const applyDigits = (digits: string) => {
    const cleaned = digits.replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    cleaned.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIdx = Math.min(cleaned.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  const handleChange = (value: string, index: number) => {
    if (value.length > 1) {
      applyDigits(value);
      return;
    }
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = otp.join('');
    if (token.length !== 6) {
      showToast('Please enter the 6-digit code', 'warning');
      return;
    }
    try {
      await verifyOtp(email, token);
      router.replace('/(tabs)');
    } catch (error) {
      showToast(getAuthErrorMessage(error), 'error');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerification(email);
      setCooldown(RESEND_COOLDOWN);
      showToast('Verification email resent', 'success');
    } catch (error) {
      showToast(getAuthErrorMessage(error), 'error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        We sent a message to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>
      <Text style={styles.hint}>
        Enter the 6-digit code, or click the link in the email.
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { if (ref) inputs.current[i] = ref; }}
            style={[styles.otpInput, digit ? styles.filledInput : null]}
            value={digit}
            onChangeText={(val) => handleChange(val, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </View>

      <Button
        label="Verify Email"
        onPress={handleVerify}
        isLoading={isLoading}
        size="lg"
        style={styles.button}
      />

      <TouchableOpacity
        style={styles.resend}
        onPress={handleResend}
        disabled={cooldown > 0}
      >
        <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : "Didn't receive it? Resend code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  email: { fontWeight: '700', color: Colors.text.primary },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    marginBottom: Spacing['3xl'],
  },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  filledInput: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  button: { marginBottom: Spacing.xl },
  resend: { alignItems: 'center' },
  resendText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  resendDisabled: { color: Colors.text.tertiary },
});
