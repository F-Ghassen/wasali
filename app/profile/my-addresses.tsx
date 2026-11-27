import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { EmptyState } from '@/components/shared/ui/layouts/EmptyState';
import { ConfirmActionModal } from '@/components/shared/ui/modals';
import { AddressBookCard } from '@/components/profile/AddressBookCard';
import { useAddressBook } from '@/hooks/useAddressBook';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { formatAddress } from '@/utils/addressFormat';

/** The sender's own addresses, the ones booking offers as pickup. */
export default function MyAddressesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { places, isLoading, refresh, setDefaultPlace, removePlace } = useAddressBook(userId);
  const { requestConfirm, confirmModal } = useConfirmAction();

  // Refetch when returning from the form.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openForm = (id?: string) =>
    router.push({ pathname: '/profile/address-form', params: { type: 'place', id: id ?? '' } } as any);

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultPlace(addressId);
      showToast('Default address updated', 'success');
    } catch {
      showToast('Could not update the default address', 'error');
    }
  };

  const confirmDelete = (addressId: string) =>
    requestConfirm('Delete?', 'This address will be removed.', async () => {
      try {
        await removePlace(addressId);
        showToast('Deleted', 'success');
      } catch {
        showToast('Could not delete. Please try again.', 'error');
      }
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My addresses</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AddressBookCard
            // Without a label the address itself is the title.
            title={item.label || formatAddress(item)}
            subtitle={item.label ? formatAddress(item) : item.country}
            detail={item.label ? item.country : null}
            badges={item.is_default ? ['Default'] : []}
            onSetDefault={item.is_default ? undefined : () => handleSetDefault(item.id)}
            onEdit={() => openForm(item.id)}
            onDelete={() => confirmDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="📍" title="No addresses yet" description="Save your address for quicker pickup in bookings" />
          )
        }
        ListFooterComponent={
          <Button label="+ Add address" onPress={() => openForm()} variant="outline" size="md" />
        }
      />
      <ConfirmActionModal {...confirmModal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  list: { padding: Spacing.base, flexGrow: 1 },
});
