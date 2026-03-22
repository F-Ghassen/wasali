import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';

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
    title: '🔐 Auth',
    color: Colors.secondary,
    routes: [
      { label: 'Welcome', path: '/(auth)/welcome' },
      { label: 'Sign Up (Sender)', path: '/(auth)/sign-up' },
      { label: 'Sign Up (Driver)', path: '/(auth)/sign-up-driver' },
      { label: 'Login', path: '/(auth)/login' },
      { label: 'Verify OTP', path: '/(auth)/verify-otp', note: 'needs ?email= param' },
      { label: 'Forgot Password', path: '/(auth)/forgot-password' },
      { label: 'Reset Password', path: '/(auth)/reset-password', note: 'needs reset token in URL' },
    ],
  },
  {
    title: '📦 Sender Tabs',
    color: Colors.primary,
    routes: [
      { label: 'Home — Browse Routes', path: '/(tabs)' },
      { label: 'My Bookings', path: '/(tabs)/bookings' },
      { label: 'Shipping Requests', path: '/(tabs)/requests' },
      { label: 'P2P — Send Docs', path: '/(tabs)/p2p/index' },
      { label: 'Profile', path: '/(tabs)/profile' },
    ],
  },
  {
    title: '🚗 Driver Tabs',
    color: '#7C3AED',
    routes: [
      { label: 'Dashboard', path: '/(driver-tabs)' },
      { label: 'My Routes', path: '/(driver-tabs)/routes' },
      { label: 'Bookings (Driver)', path: '/(driver-tabs)/bookings' },
      { label: 'Profile (Driver)', path: '/(driver-tabs)/profile' },
    ],
  },
  {
    title: '🗺️ Driver — Route Mgmt',
    color: '#059669',
    routes: [
      { label: 'Create New Route', path: '/driver/routes/new' },
      { label: 'Route Detail / Edit', path: '/driver/routes/[id]', note: 'replace [id] with UUID' },
      { label: 'Booking Detail (Driver)', path: '/driver/bookings/[id]', note: 'replace [id] with UUID' },
    ],
  },
  {
    title: '📋 Booking Flow',
    color: Colors.success,
    routes: [
      { label: 'Package Details', path: '/booking/package-details', note: 'needs routeId param' },
      { label: 'Logistics', path: '/booking/logistics', note: 'needs booking state' },
      { label: 'Review & Pay', path: '/booking/review-pay', note: 'needs booking state' },
    ],
  },
  {
    title: '🔍 Detail Screens',
    color: '#D97706',
    routes: [
      { label: 'Booking Detail (Sender)', path: '/bookings/[id]', note: 'replace [id] with UUID' },
      { label: 'Route Results', path: '/(tabs)/routes/results', note: 'needs search params' },
    ],
  },
  {
    title: '📬 Shipping Requests',
    color: Colors.warning,
    routes: [
      { label: 'New Request', path: '/shipping-requests/new' },
      { label: 'Request Detail', path: '/shipping-requests/[id]', note: 'replace [id] with UUID' },
    ],
  },
  {
    title: '🤝 P2P Screens',
    color: '#0EA5E9',
    routes: [
      { label: 'P2P Hub', path: '/(tabs)/p2p/index' },
      { label: 'P2P — Send', path: '/(tabs)/p2p/send' },
      { label: 'P2P — Carry', path: '/(tabs)/p2p/carry' },
      { label: 'P2P — Leaderboard', path: '/(tabs)/p2p/leaderboard' },
    ],
  },
  {
    title: '⭐ Post-Delivery',
    color: Colors.error,
    routes: [
      { label: 'Rate Driver', path: '/post-delivery/rate/[bookingId]', note: 'replace [bookingId]' },
      { label: 'Open Dispute', path: '/post-delivery/dispute/[bookingId]', note: 'replace [bookingId]' },
    ],
  },
  {
    title: '👤 Profile Screens',
    color: '#6B7280',
    routes: [
      { label: 'Edit Profile', path: '/profile/edit' },
      { label: 'Saved Addresses', path: '/profile/addresses' },
      { label: 'Add Address', path: '/profile/add-address' },
      { label: 'Notifications', path: '/profile/notifications' },
    ],
  },
];

const TEST_ACCOUNTS = [
  { label: 'Driver 1', email: 'driver1@wasali.test', password: 'TestDriver1!', role: 'driver' },
  { label: 'Driver 2', email: 'driver2@wasali.test', password: 'TestDriver2!', role: 'driver' },
] as const;

function SessionBanner() {
  const { session, profile, signIn, signOut, isLoading } = useAuthStore();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, password: string, role: string) => {
    setLoggingIn(email);
    try {
      await signIn(email, password);
      router.replace(role === 'driver' ? '/(driver-tabs)' as any : '/(tabs)');
    } finally {
      setLoggingIn(null);
    }
  };

  return (
    <View style={bannerStyles.container}>
      {session ? (
        <>
          <View style={bannerStyles.row}>
            <Text style={bannerStyles.label}>Signed in as</Text>
            <Text style={bannerStyles.email} numberOfLines={1}>{session.user.email}</Text>
            <View style={[bannerStyles.rolePill, profile?.role === 'driver' ? bannerStyles.driverPill : bannerStyles.senderPill]}>
              <Text style={bannerStyles.roleText}>{profile?.role ?? '…'}</Text>
            </View>
          </View>
          <TouchableOpacity style={bannerStyles.signOutBtn} onPress={signOut} disabled={isLoading}>
            <Text style={bannerStyles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={bannerStyles.notSignedIn}>Not signed in — quick login:</Text>
          <View style={bannerStyles.quickLoginRow}>
            {TEST_ACCOUNTS.map((a) => (
              <TouchableOpacity
                key={a.email}
                style={[bannerStyles.quickBtn, loggingIn === a.email && bannerStyles.quickBtnDisabled]}
                disabled={loggingIn !== null}
                onPress={() => handleQuickLogin(a.email, a.password, a.role)}
              >
                <Text style={bannerStyles.quickBtnText}>
                  {loggingIn === a.email ? '…' : a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function DevScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [customPath, setCustomPath] = useState('');

  const q = query.toLowerCase();
  const filteredSections = q
    ? SECTIONS.map((s) => ({
        ...s,
        routes: s.routes.filter(
          (r) => r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)
        ),
      })).filter((s) => s.routes.length > 0)
    : SECTIONS;

  const totalRoutes = SECTIONS.reduce((acc, s) => acc + s.routes.length, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Wasali Dev Navigator</Text>
          <Text style={styles.subtitle}>{totalRoutes} routes across {SECTIONS.length} sections</Text>
        </View>

        <SessionBanner />

        {/* Search */}
        <TextInput
          style={styles.search}
          placeholder="Filter routes…"
          placeholderTextColor={Colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {/* Custom path jump */}
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="Custom path, e.g. /bookings/some-uuid"
            placeholderTextColor={Colors.text.tertiary}
            value={customPath}
            onChangeText={setCustomPath}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.customBtn, !customPath && styles.customBtnDisabled]}
            disabled={!customPath}
            onPress={() => { router.push(customPath as any); setCustomPath(''); }}
          >
            <Text style={styles.customBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {filteredSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.routes.length}</Text>
            </View>
            {section.routes.map((route) => {
              const isDynamic = route.path.includes('[');
              return (
                <TouchableOpacity
                  key={route.path}
                  style={styles.row}
                  onPress={() => { if (!isDynamic) router.push(route.path as any); }}
                  activeOpacity={isDynamic ? 1 : 0.6}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.label}>{route.label}</Text>
                    <Text style={styles.path}>{route.path}</Text>
                    {route.note && <Text style={styles.note}>⚠ {route.note}</Text>}
                  </View>
                  {isDynamic ? (
                    <View style={styles.dynamicBadge}>
                      <Text style={styles.dynamicText}>dynamic</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: section.color + '20' }]}>
                      <Text style={[styles.badgeText, { color: section.color }]}>Go →</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {filteredSections.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No routes match "{query}"</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
  header: { marginBottom: Spacing.md },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  search: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  customBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBtnDisabled: { opacity: 0.35 },
  customBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  section: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.tertiary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: Spacing.sm,
  },
  rowLeft: { flex: 1, gap: 2 },
  label: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  path: { fontSize: FontSize.xs, color: Colors.text.secondary, fontFamily: 'monospace' },
  note: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  dynamicBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.tertiary,
  },
  dynamicText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.tertiary },
  empty: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.text.tertiary },
});

const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  label: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  email: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600', flex: 1, fontFamily: 'monospace' },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  senderPill: { backgroundColor: Colors.primaryLight },
  driverPill: { backgroundColor: 'rgba(124,58,237,0.1)' },
  roleText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.primary },
  signOutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  signOutText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },
  notSignedIn: { fontSize: FontSize.sm, color: Colors.text.secondary },
  quickLoginRow: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  quickBtnDisabled: { opacity: 0.5 },
  quickBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
