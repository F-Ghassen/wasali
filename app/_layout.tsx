import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ToastContainer } from '@/components/ui/Toast';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';

const isStripeReady = Boolean(
  Platform.OS !== 'web' &&
  STRIPE_PUBLISHABLE_KEY &&
  !STRIPE_PUBLISHABLE_KEY.includes('your_stripe')
);

// Only import StripeProvider on native — the module crashes on web
const StripeProvider = isStripeReady
  ? require('@stripe/stripe-react-native').StripeProvider
  : null;

export default function RootLayout() {
  const { setSession, loadProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const stackAndToast = (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="routes" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="shipping-requests" />
        <Stack.Screen name="post-delivery" />
        <Stack.Screen name="profile" />
      </Stack>
      <ToastContainer />
      <StatusBar style="auto" />
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
