import React from 'react';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Package, User, SendHorizonal } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Footer } from '@/components/ui/Footer';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/Button';
import { LanguageNavButton } from '@/components/ui/LanguageNavButton';

const ICON_SIZE_WIDE = 18;
const ICON_SIZE_MOBILE = 22;

function WrongRoleScreen({ targetRole }: { targetRole: 'driver' | 'sender' }) {
  const router = useRouter();
  const { signOut } = useAuthStore();

  const isDriverArea = targetRole === 'driver';

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.icon}>{isDriverArea ? '🚛' : '📦'}</Text>
      <Text style={styles.title}>
        {isDriverArea ? 'Driver Area' : 'Sender Area'}
      </Text>
      <Text style={styles.message}>
        {isDriverArea
          ? 'This section is for registered drivers only. Your account is set up as a sender.'
          : 'This section is for senders. Your account is set up as a driver.'}
      </Text>
      <Button
        label={isDriverArea ? 'Go to Sender App' : 'Go to Driver Dashboard'}
        onPress={() => router.replace(isDriverArea ? '/(tabs)' : ('/(driver-tabs)' as any))}
        size="lg"
      />
      <Button
        label="Sign Out"
        onPress={signOut}
        variant="ghost"
        size="lg"
      />
    </SafeAreaView>
  );
}

function BadgeIcon({ icon, unread }: { icon: React.ReactNode; unread: number }) {
  return (
    <View style={{ position: 'relative' }}>
      {icon}
      {unread > 0 && (
        <View style={badgeStyles.dot} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const iconSize = isWide ? ICON_SIZE_WIDE : ICON_SIZE_MOBILE;
  const { session, profile, isInitialized } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // 1. Still bootstrapping — show spinner
  if (!isInitialized) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Profile failed to load (timed out or error) — force re-auth
  if (session && !profile) return <Redirect href="/(auth)/welcome" />;

  // 2. No session → send to welcome
  if (!session) return <Redirect href="/(auth)/welcome" />;

  // 3. Wrong role → guided message
  if (profile?.role !== 'sender') {
    return <WrongRoleScreen targetRole="sender" />;
  }

  return (
    <View style={{ flex: 1 }}>
    <LanguageNavButton />
    <Tabs
      screenOptions={{
        tabBarPosition: isWide ? 'top' : 'bottom',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: isWide
          ? {
              backgroundColor: Colors.white,
              borderTopWidth: 0,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border.light,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 4,
            }
          : {
              backgroundColor: Colors.white,
              borderTopColor: Colors.border.light,
              borderTopWidth: 1,
              height: 80,
              paddingBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 4,
            },
        tabBarShowLabel: true,
        tabBarLabelStyle: isWide
          ? { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'none', letterSpacing: 0, marginLeft: Spacing.xs }
          : { fontSize: 11, fontWeight: '500', letterSpacing: 0.2, marginLeft: 4 },
        tabBarItemStyle: isWide
          ? { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md }
          : { flexDirection: 'row', alignItems: 'center', gap: 4 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <Package size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="p2p/index"
        options={{
          title: 'Ship Docs Fast',
          tabBarIcon: ({ color }) => <SendHorizonal size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <BadgeIcon
              icon={<User size={iconSize} color={color} strokeWidth={2} />}
              unread={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen name="requests" options={{ href: null }} />
      {/* Hidden screens — part of tabs layout for nav bar, not shown as tab items */}
      <Tabs.Screen name="routes/results"        options={{ href: null }} />
      <Tabs.Screen name="booking/index"         options={{ href: null }} />
      <Tabs.Screen name="booking/confirmation"  options={{ href: null }} />
      <Tabs.Screen name="tracking/[bookingId]"  options={{ href: null }} />
      <Tabs.Screen name="p2p/send"              options={{ href: null }} />
      <Tabs.Screen name="p2p/carry"             options={{ href: null }} />
      <Tabs.Screen name="p2p/leaderboard"       options={{ href: null }} />
    </Tabs>
    {isWide && <Footer />}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    backgroundColor: Colors.background.primary,
  },
  icon: { fontSize: 56, marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
  },
});
