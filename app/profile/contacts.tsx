import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { EmptyState } from '@/components/shared/ui/layouts/EmptyState';
import { ContactCard } from '@/components/profile/ContactCard';
import { useContacts } from '@/hooks/useContacts';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function ContactsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const showToast = useUIStore((s) => s.showToast);
  const { contacts, isLoading, refresh, removeContact } = useContacts(userId);

  // Refetch when returning from the edit screen.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleDelete = (contactId: string) => {
    Alert.alert('Delete contact?', 'The contact and its address will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeContact(contactId);
            showToast('Contact deleted', 'success');
          } catch {
            showToast('Could not delete the contact', 'error');
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
        <Text style={styles.headerTitle}>Contacts</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            onEdit={(id) => router.push({ pathname: '/profile/contact', params: { id } } as any)}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="👥"
              title="No contacts yet"
              description="People you send to are saved here when you book"
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
