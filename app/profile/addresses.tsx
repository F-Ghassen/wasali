import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { SavedAddress } from '@/types/models';

export default function AddressesScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => setAddresses((data as SavedAddress[]) ?? []));
  }, [session]);

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
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <Text style={styles.label}>{item.label}</Text>
              {item.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.street}>{item.street}</Text>
            <Text style={styles.city}>{item.city}, {item.country}</Text>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📍"
            title="No saved addresses"
            description="Save addresses for quicker booking"
          />
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
  addressCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  addressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  defaultBadge: { backgroundColor: Colors.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  street: { fontSize: FontSize.sm, color: Colors.text.secondary },
  city: { fontSize: FontSize.sm, color: Colors.text.tertiary },
});
