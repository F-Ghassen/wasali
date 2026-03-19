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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationList } from '@/components/ui/NotificationList';
import { RouteAlertList } from '@/components/ui/RouteAlertList';
import { LanguagePickerModal } from '@/components/ui/LanguagePickerModal';

function ProfileRow({
  icon,
  label,
  badge,
  onPress,
  isDestructive,
}: {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, isDestructive && styles.destructive]}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const { unreadCount, fetchNotifications, subscribeRealtime } = useNotificationStore();
  const [notifVisible, setNotifVisible] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);

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
      showToast(t('profile.signOutError'), 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('senderProfile.account')}</Text>
          <View style={styles.card}>
            <ProfileRow icon="✏️" label={t('senderProfile.editProfile')} onPress={() => router.push('/profile/edit')} />
            <View style={styles.separator} />
            <ProfileRow icon="📍" label={t('senderProfile.savedAddresses')} onPress={() => router.push('/profile/addresses')} />
            <View style={styles.separator} />
            <ProfileRow
              icon="🔔"
              label={t('profile.notifications')}
              badge={unreadCount}
              onPress={() => setNotifVisible(true)}
            />
            <View style={styles.separator} />
            <ProfileRow
              icon="🛎️"
              label="Route Alerts"
              onPress={() => setAlertsVisible(true)}
            />
            <View style={styles.separator} />
            <ProfileRow icon="🌐" label={t('profile.language')} onPress={() => setLangVisible(true)} />
          </View>
        </View>

        <NotificationList visible={notifVisible} onClose={() => setNotifVisible(false)} />
        <RouteAlertList visible={alertsVisible} onClose={() => setAlertsVisible(false)} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('senderProfile.support')}</Text>
          <View style={styles.card}>
            <ProfileRow icon="❓" label={t('profile.helpCenter')} onPress={() => {}} />
            <View style={styles.separator} />
            <ProfileRow icon="📜" label={t('profile.termsPrivacy')} onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <ProfileRow icon="🚪" label={t('profile.signOut')} onPress={handleSignOut} isDestructive />
          </View>
        </View>
      </ScrollView>

      <LanguagePickerModal visible={langVisible} onClose={() => setLangVisible(false)} />
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
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing['2xl'] },
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
