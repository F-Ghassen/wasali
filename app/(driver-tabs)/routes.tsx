import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { DriverRouteCard } from '@/components/driver/DriverRouteCard';
import { EmptyState } from '@/components/ui/EmptyState';

type FilterOption = 'all' | 'active' | 'completed' | 'cancelled';

const FILTERS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function DriverRoutesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { routes, fetchRoutes, isLoading } = useDriverRouteStore();
  const { bookings, fetchBookings } = useDriverBookingStore();
  const [filter, setFilter] = useState<FilterOption>('all');

  const load = () => {
    if (!profile) return;
    fetchRoutes(profile.id, filter);
    fetchBookings(profile.id);
  };

  useEffect(() => { load(); }, [profile?.id, filter]);

  const bookingCountForRoute = (routeId: string) =>
    bookings.filter((b) => b.route_id === routeId).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Routes</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/driver/routes/new' as any)}
        >
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DriverRouteCard
            route={item}
            bookingCount={bookingCountForRoute(item.id)}
            onPress={() => router.push({ pathname: '/driver/routes/[id]' as any, params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={filter === 'all' ? 'No routes yet' : `No ${filter} routes`}
              description={filter === 'all' ? 'Create your first route to start accepting packages.' : undefined}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  fab: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  chipTextActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },
});
