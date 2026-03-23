import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Package, CheckCircle, Truck, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore, AppNotification } from '@/stores/notificationStore';

const TYPE_ICON: Record<string, React.ReactNode> = {
  new_booking: <Package size={18} color={Colors.secondary} />,
  booking_confirmed: <CheckCircle size={18} color={Colors.success} />,
  in_transit: <Truck size={18} color={Colors.warning} />,
  delivered: <MapPin size={18} color={Colors.success} />,
  route_alert: <Bell size={18} color={Colors.secondary} />,
  route_alert_created: <Bell size={18} color={Colors.success} />,
};

function NotificationRow({
  item,
  role,
  onPress,
}: {
  item: AppNotification;
  role: 'sender' | 'driver' | undefined;
  onPress: (item: AppNotification) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        {TYPE_ICON[item.type] ?? <Bell size={18} color={Colors.text.tertiary} />}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.message, !item.read && styles.messageUnread]}>{item.message}</Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { notifications, unreadCount, isLoading, markRead, markAllRead, fetchNotifications, subscribeRealtime } = useNotificationStore();

  useEffect(() => {
    if (!profile) return;
    fetchNotifications(profile.id);
    const unsubscribe = subscribeRealtime(profile.id);
    return unsubscribe;
  }, [profile?.id, fetchNotifications, subscribeRealtime]);

  const handleNotificationPress = (item: AppNotification) => {
    if (!item.read) markRead(item.id);
    if (item.booking_id) {
      if (profile?.role === 'driver') {
        router.push({ pathname: '/driver/bookings/[id]' as any, params: { id: item.booking_id } });
      } else {
        router.push({ pathname: '/bookings/[id]' as any, params: { id: item.booking_id } });
      }
    }
  };

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.notifications')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={40} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} role={profile?.role as 'sender' | 'driver' | undefined} onPress={handleNotificationPress} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  markAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  markAllText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.secondary },
  list: { paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  rowUnread: { backgroundColor: Colors.background.secondary },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  message: { fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 20 },
  messageUnread: { color: Colors.text.primary, fontWeight: '600' },
  time: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: { fontSize: FontSize.base, color: Colors.text.tertiary },
});
