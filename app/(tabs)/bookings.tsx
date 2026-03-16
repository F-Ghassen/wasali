import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { BookingCard } from '@/components/booking/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { BookingWithRoute } from '@/types/models';

export default function BookingsScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [bookings, setBookings] = useState<BookingWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, route:routes(*, route_stops(*))')
      .eq('sender_id', session.user.id)
      .order('created_at', { ascending: false });
    setBookings((data as BookingWithRoute[]) ?? []);
  };

  useEffect(() => {
    loadBookings().finally(() => setIsLoading(false));
  }, []);

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
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/bookings/${item.id}`)}
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
});
