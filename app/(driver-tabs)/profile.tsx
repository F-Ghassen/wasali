import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationList } from '@/components/ui/NotificationList';

function ProfileRow({
  icon,
  label,
  value,
  badge,
  onPress,
  isDestructive,
}: {
  icon: string;
  label: string;
  value?: string;
  badge?: number;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, isDestructive && styles.destructive]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function DriverProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { stats } = useDriverBookingStore();
  const { showToast } = useUIStore();
  const { unreadCount, fetchNotifications, subscribeRealtime } = useNotificationStore();
  const [notifVisible, setNotifVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications(profile.id);
    const unsubscribe = subscribeRealtime(profile.id);
    return unsubscribe;
  }, [profile?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? 'Driver'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>🚗 Traveller</Text>
        </View>

        {/* Driver stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>€{stats.totalEarnings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <ProfileRow icon="✏️" label="Edit Profile" onPress={() => router.push('/profile/edit')} />
            <View style={styles.separator} />
            <ProfileRow
              icon="🔔"
              label="Notifications"
              badge={unreadCount}
              onPress={() => setNotifVisible(true)}
            />
          </View>
        </View>

        <NotificationList visible={notifVisible} onClose={() => setNotifVisible(false)} />

        {/* Support section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <ProfileRow icon="❓" label="Help Center" onPress={() => {}} />
            <View style={styles.separator} />
            <ProfileRow icon="📜" label="Terms & Privacy" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <ProfileRow icon="🚪" label="Sign Out" onPress={handleSignOut} isDestructive />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.base, alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.base,
  },
  avatarText: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.sm },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  roleText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    width: '100%',
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border.light },
  section: { width: '100%', marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  rowIcon: { fontSize: 20, width: 28 },
  rowLabel: { flex: 1, fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  rowValue: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  destructive: { color: Colors.error },
  chevron: { fontSize: 18, color: Colors.text.tertiary },
  separator: { height: 1, backgroundColor: Colors.border.light, marginLeft: 60 },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});
