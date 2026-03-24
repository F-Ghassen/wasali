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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { DriverBookingCard } from '@/components/driver/DriverBookingCard';
import { EmptyState } from '@/components/ui/EmptyState';

type FilterOption = 'all' | 'pending' | 'confirmed' | 'in_transit' | 'delivered';

export default function DriverBookingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { bookings, fetchBookings, confirmBooking, rejectBooking, isLoading } = useDriverBookingStore();
  const [filter, setFilter] = useState<FilterOption>('all');

  const FILTERS: { key: FilterOption; label: string }[] = [
    { key: 'all', label: t('driverBookings.filters.all') },
    { key: 'pending', label: t('driverBookings.filters.pending') },
    { key: 'confirmed', label: t('driverBookings.filters.confirmed') },
    { key: 'in_transit', label: t('driverBookings.filters.inTransit') },
    { key: 'delivered', label: t('driverBookings.filters.delivered') },
  ];

  const load = () => {
    if (profile) fetchBookings(profile.id, filter === 'all' ? 'all' : filter);
  };

  useEffect(() => { load(); }, [profile?.id, filter, fetchBookings]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('driverBookings.title')}</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterScroll}>
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
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DriverBookingCard
            booking={item}
            onConfirm={item.status === 'pending' ? () => confirmBooking(item.id) : undefined}
            onReject={item.status === 'pending' ? () => rejectBooking(item.id) : undefined}
            onRate={item.status === 'delivered' ? () => router.push(`/driver/rate/${item.id}`) : undefined}
            onPress={() => router.push(`/driver/bookings/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={filter === 'all' ? t('driverBookings.emptyAll') : t('driverBookings.emptyFiltered', { filter: filter.replace('_', ' ') })}
              description={t('driverBookings.emptyDesc')}
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    flexWrap: 'wrap',
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
