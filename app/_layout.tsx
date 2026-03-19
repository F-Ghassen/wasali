import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ToastContainer } from '@/components/ui/Toast';
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import { initI18n } from '@/lib/i18n';

const isStripeReady = Boolean(
  Platform.OS !== 'web' &&
  STRIPE_PUBLISHABLE_KEY &&
  !STRIPE_PUBLISHABLE_KEY.includes('your_stripe')
);

// Only import StripeProvider on native — the module crashes on web
const StripeProvider = isStripeReady
  ? require('@stripe/stripe-react-native').StripeProvider
  : null;

function roleRoute(role?: string) {
  return (role === 'driver' ? '/(driver-tabs)' : '/(tabs)') as any;
}

export default function RootLayout() {
  const { setSession, loadProfile, setInitialized, isInitialized, profile, session } = useAuthStore();
  const router = useRouter();
  const [i18nReady, setI18nReady] = useState(false);

  // i18n bootstrap — runs once, before anything is rendered
  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  // Session bootstrap — always call setInitialized so the spinner never hangs
  useEffect(() => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    Promise.race([supabase.auth.getSession(), timeout])
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) {
          await loadProfile(s.user.id);
        }
      })
      .catch(() => {})
      .finally(() => { setInitialized(); });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') { router.replace('/(auth)/welcome'); return; }
      if (event === 'PASSWORD_RECOVERY') { router.replace('/(auth)/reset-password'); return; }
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
        await loadProfile(s.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Role-based redirect: fires once profile loads after a sign-in
  useEffect(() => {
    if (!isInitialized || !session || !profile) return;
    router.replace(roleRoute(profile.role));
  }, [isInitialized, session, profile]);

  if (!isInitialized || !i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const stackAndToast = (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dev" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(driver-tabs)" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="routes" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="shipping-requests" />
        <Stack.Screen name="post-delivery" />
        <Stack.Screen name="profile" />
      </Stack>
      <ToastContainer />
      <StatusBar style="dark" />
      {__DEV__ && <DevRoleSwitcher />}
    </>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {isStripeReady ? (
          <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            {stackAndToast}
          </StripeProvider>
        ) : stackAndToast}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
