import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { EmptyState } from '@/components/shared/ui/layouts/EmptyState';
import { AddressCard } from '@/components/profile/AddressCard';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function AddressesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { addresses, isLoading, refresh, setDefault, removeAddress } = useSavedAddresses(userId);

  // Refetch when returning from the add/edit screen.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefault(addressId);
      showToast('Default address updated', 'success');
    } catch {
      showToast('Could not update the default address', 'error');
    }
  };

  const handleDelete = (addressId: string) => {
    Alert.alert('Delete address?', 'This address will be removed from your address book.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeAddress(addressId);
            showToast('Address deleted', 'success');
          } catch {
            showToast('Could not delete the address', 'error');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <Button
            label="+ Add New Address"
            onPress={() => router.push('/profile/add-address')}
            variant="outline"
            size="md"
          />
        }
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            onSetDefault={handleSetDefault}
            onEdit={(id) => router.push({ pathname: '/profile/add-address', params: { id } })}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="📍"
              title="No saved addresses"
              description="Save addresses for quicker booking"
            />
          )
        }
      />
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
