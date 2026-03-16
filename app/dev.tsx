import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

type Route = {
  label: string;
  path: string;
  note?: string;
};

type Section = {
  title: string;
  color: string;
  routes: Route[];
};

const SECTIONS: Section[] = [
  {
    title: 'Auth',
    color: Colors.secondary,
    routes: [
      { label: 'Welcome', path: '/(auth)/welcome' },
      { label: 'Sign Up', path: '/(auth)/sign-up' },
      { label: 'Login', path: '/(auth)/login' },
      { label: 'Verify OTP', path: '/(auth)/verify-otp', note: 'needs email param' },
      { label: 'Forgot Password', path: '/(auth)/forgot-password' },
    ],
  },
  {
    title: 'Tabs',
    color: Colors.primary,
    routes: [
      { label: 'Home (Browse Routes)', path: '/(tabs)' },
      { label: 'My Bookings', path: '/(tabs)/bookings' },
      { label: 'Shipping Requests', path: '/(tabs)/requests' },
      { label: 'Profile', path: '/(tabs)/profile' },
    ],
  },
  {
    title: 'Booking Flow',
    color: Colors.success,
    routes: [
      { label: 'Package Details', path: '/booking/package-details', note: 'needs routeId param' },
      { label: 'Logistics', path: '/booking/logistics', note: 'needs booking state' },
      { label: 'Review & Pay', path: '/booking/review-pay', note: 'needs booking state' },
    ],
  },
  {
    title: 'Detail Screens',
    color: '#7C3AED',
    routes: [
      { label: 'Booking Detail', path: '/bookings/[id]', note: 'replace [id] with real UUID' },
      { label: 'Route Detail', path: '/routes/[id]', note: 'replace [id] with real UUID' },
      { label: 'Route Results', path: '/routes/results', note: 'needs search params' },
    ],
  },
  {
    title: 'Shipping Requests',
    color: Colors.warning,
    routes: [
      { label: 'New Request', path: '/shipping-requests/new' },
      { label: 'Request Detail', path: '/shipping-requests/[id]', note: 'replace [id] with real UUID' },
    ],
  },
  {
    title: 'Post-Delivery',
    color: Colors.error,
    routes: [
      { label: 'Rate Driver', path: '/post-delivery/rate/[bookingId]', note: 'replace [bookingId]' },
      { label: 'Open Dispute', path: '/post-delivery/dispute/[bookingId]', note: 'replace [bookingId]' },
    ],
  },
];

export default function DevScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Wasali Dev Navigator</Text>
          <Text style={styles.subtitle}>Tap any route to navigate directly</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.routes.map((route) => (
              <TouchableOpacity
                key={route.path}
                style={styles.row}
                onPress={() => {
                  if (!route.path.includes('[')) {
                    router.push(route.path as any);
                  }
                }}
                activeOpacity={route.path.includes('[') ? 1 : 0.6}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.label}>{route.label}</Text>
                  <Text style={styles.path}>{route.path}</Text>
                  {route.note && <Text style={styles.note}>{route.note}</Text>}
                </View>
                {!route.path.includes('[') && (
                  <View style={[styles.badge, { backgroundColor: section.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: section.color }]}>Go</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.tertiary,
    borderLeftWidth: 4,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  path: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  note: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
