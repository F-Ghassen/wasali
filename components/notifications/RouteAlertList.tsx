import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { Bell, Trash2, X, MapPin, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useRouteAlertStore, RouteAlert } from '@/stores/routeAlertStore';
import { useAuthStore } from '@/stores/authStore';

// Inline confirm: first tap shows "Confirm?" prompt, second tap deletes.
function AlertRow({
  item,
  isDeleting,
  onDelete,
}: {
  item: RouteAlert;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const dateLabel = item.date_from
    ? format(parseISO(item.date_from), 'MMM d, yyyy')
    : 'Any date';

  const handleTrashPress = () => {
    if (confirming) {
      onDelete(item.id);
    } else {
      setConfirming(true);
    }
  };

  // Reset confirm state if row is no longer being deleted
  useEffect(() => {
    if (!isDeleting) setConfirming(false);
  }, [isDeleting]);

  return (
    <View style={[styles.row, (isDeleting || confirming) && styles.rowFaded]}>
      <View style={styles.iconWrap}>
        <Bell size={18} color={Colors.secondary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.routeLine}>
          <MapPin size={12} color={Colors.text.tertiary} />
          <Text style={styles.routeText}>
            Route Alert
          </Text>
        </View>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Text style={styles.createdText}>
          Added {format(parseISO(item.created_at), 'MMM d, yyyy')}
        </Text>
      </View>

      {confirming ? (
        <View style={styles.confirmRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setConfirming(false)}
            hitSlop={8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleTrashPress}
            hitSlop={8}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.confirmText}>Remove</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleTrashPress} hitSlop={8}>
          <Trash2 size={18} color={Colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface RouteAlertListProps {
  visible: boolean;
  onClose: () => void;
}

export function RouteAlertList({ visible, onClose }: RouteAlertListProps) {
  const { profile } = useAuthStore();
  const { alerts, isLoading, fetchAlerts, deleteAlert } = useRouteAlertStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && profile?.id) {
      fetchAlerts(profile.id);
    }
  }, [visible, profile?.id]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteAlert(id);
    } catch {
      setDeleteError('Could not remove alert. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Route Alerts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {deleteError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{deleteError}</Text>
            <TouchableOpacity onPress={() => setDeleteError(null)}>
              <X size={14} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.empty}>
            <Bell size={40} color={Colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No route alerts</Text>
            <Text style={styles.emptySubtitle}>
              When you set up alerts from the search screen,{'\n'}they'll appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AlertRow
                item={item}
                isDeleting={deletingId === item.id}
                onDelete={handleDelete}
              />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
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
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.error, flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.secondary },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: { paddingVertical: Spacing.sm },
  separator: { height: 1, backgroundColor: Colors.border.light, marginLeft: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowFaded: { opacity: 0.6 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  dateText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  createdText: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cancelBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  cancelText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  confirmBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  confirmText: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '700' },
});
