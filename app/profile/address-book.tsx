import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { EmptyState } from '@/components/shared/ui/layouts/EmptyState';
import { ConfirmActionModal } from '@/components/shared/ui/modals';
import { PersonCard } from '@/components/profile/PersonCard';
import { useAddressBook } from '@/hooks/useAddressBook';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

/** The people the sender sends to. Each person's addresses are edited in Edit person. */
export default function AddressBookScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const {
    people,
    isLoading,
    isLoadingMorePeople,
    hasMorePeople,
    loadMorePeople,
    refresh,
    removePerson,
  } = useAddressBook(userId);
  const { requestConfirm, confirmModal } = useConfirmAction();

  // Refetch when returning from the form.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openPersonForm = (personId?: string) =>
    router.push({ pathname: '/profile/address-form', params: { type: 'person', id: personId ?? '' } } as any);

  const confirmDelete = (message: string, onDelete: () => Promise<void>) =>
    requestConfirm('Delete?', message, async () => {
      try {
        await onDelete();
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
        <Text style={styles.headerTitle}>Address Book</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={people}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PersonCard
            person={item}
            onEdit={() => openPersonForm(item.id)}
            onDelete={() =>
              confirmDelete('This person and their addresses will be removed.', () => removePerson(item.id))
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="👤" title="No contacts" description="Save the people you send packages to" />
          )
        }
        onEndReached={hasMorePeople ? loadMorePeople : undefined}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.addButton}>
            <Button label="+ Add Person" onPress={() => openPersonForm()} variant="outline" size="md" />
          </View>
        }
        ListFooterComponent={isLoadingMorePeople ? <ActivityIndicator color={Colors.primary} style={styles.footer} /> : null}
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
  addButton: { marginBottom: Spacing.md },
  footer: { paddingVertical: Spacing.md },
});
