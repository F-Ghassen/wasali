import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { BookingCard } from './bookingList/components/BookingCard';
import { EmptyState } from '@/components/shared/ui/layouts/EmptyState';
import { SkeletonCard } from '@/components/shared/ui/primitives/Skeleton';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { BookingWithRoute } from '@/types/models';

export default function BookingListScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [bookings, setBookings] = useState<BookingWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!session) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select('*, route:routes(*, route_stops(*))')
      .eq('sender_id', session.user.id)
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBookings((data as BookingWithRoute[]) ?? []);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadBookings().finally(() => setIsLoading(false));
    }, [loadBookings]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>
      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Could not load bookings.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/(tabs)/booking/bookingDetail/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="No bookings yet"
              description="Search for a route and book your first shipment"
              actionLabel="Search Routes"
              onAction={() => router.push('/(tabs)')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { padding: Spacing.base, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  list: { padding: Spacing.base, flexGrow: 1 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  errorText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.base },
});
