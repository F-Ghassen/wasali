import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>✈️📦</Text>
        <Text style={styles.title}>Wasali</Text>
        <Text style={styles.subtitle}>
          Ship packages from Europe to Tunisia — fast, trusted, affordable.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: '🚛', text: 'Trusted Tunisian cargo drivers' },
          { icon: '💶', text: 'Secure Stripe payment & escrow' },
          { icon: '📍', text: 'Real-time shipment tracking' },
        ].map((f) => (
          <View key={f.text} style={styles.feature}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Get Started — Ship a Package"
          onPress={() => router.push('/(auth)/sign-up')}
          size="lg"
        />
        <Button
          label="I'm a traveller — Earn by carrying"
          onPress={() => router.push('/(auth)/sign-up-driver' as any)}
          variant="outline"
          size="lg"
        />
        <Button
          label="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          size="lg"
        />
        {__DEV__ && (
          <TouchableOpacity onPress={() => router.push('/dev' as any)} style={styles.devLink}>
            <Text style={styles.devLinkText}>🛠 Dev Navigator</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing['2xl'],
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 72, marginBottom: Spacing.base },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: Spacing.md,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  features: { gap: Spacing.md, marginBottom: Spacing['3xl'] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: { fontSize: 24 },
  featureText: { fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  actions: { gap: Spacing.sm, paddingBottom: Spacing['2xl'] },
  devLink: { alignItems: 'center', paddingVertical: Spacing.xs },
  devLinkText: { fontSize: FontSize.sm, color: Colors.text.tertiary, textDecorationLine: 'underline' },
});
