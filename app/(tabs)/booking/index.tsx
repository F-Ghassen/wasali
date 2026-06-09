import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
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

const PAGE_SIZE = 10;

export default function BookingListScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [bookings, setBookings] = useState<BookingWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async (pageNum = 0, replace = true) => {
    if (!session) return;
    setError(null);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select('*, route:routes(*, route_stops(*))')
      .eq('sender_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      const items = (data as BookingWithRoute[]) ?? [];
      setBookings(prev => replace ? items : [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setPage(0);
      setHasMore(true);
      loadBookings(0, true).finally(() => setIsLoading(false));
    }, [loadBookings]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings(0, true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadBookings(page + 1, false);
    setLoadingMore(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/routes/results' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ Search Driver</Text>
        </TouchableOpacity>
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/(tabs)/booking/bookingDetail/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="No bookings yet"
              description="Search for a route and book your first shipment"
              actionLabel="Search Routes"
              onAction={() => router.push('/(tabs)' as any)}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={Colors.text.tertiary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  newBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  newBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  list: { padding: Spacing.base, flexGrow: 1 },
  footer: { paddingVertical: Spacing.xl, alignItems: 'center' },
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
