import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { localTodayString } from '@/utils/formatters';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { StatCard } from '@/components/driver/stats/StatCard';
import { EarningsSummary } from '@/components/driver/earnings/EarningsSummary';
import { RevenueChart } from '@/components/driver/earnings/RevenueChart';
import { StatusBadge } from '@/components/shared/ui/primitives/StatusBadge';
import { DriverRouteCard } from '@/components/driver/routes/DriverRouteCard';
import type { BookingStatus } from '@/constants/bookingStatus';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { routes, fetchRoutes, isLoading: routesLoading, error: routesError } = useDriverRouteStore();
  const { bookings, stats, fetchBookings, getMonthlyRevenue, isLoading: bookingsLoading, isInitialized: bookingsInitialized } = useDriverBookingStore();

  const isRefreshing = routesLoading || bookingsLoading;

  const load = useCallback(() => {
    if (!profile) return;
    fetchRoutes(profile.id, 'active');
    fetchBookings(profile.id, 'all');
  }, [profile?.id]);

  // Fire on mount + whenever the screen comes back into focus (e.g. after
  // role switch via DevRoleSwitcher, or returning from route creation).
  useFocusEffect(load);

  // Also fire whenever profile.id first becomes available after login.
  useEffect(() => { load(); }, [profile?.id]);

  const upcomingRoutes = routes
    .filter((r) => r.status === 'active' && r.departure_date >= localTodayString())
    .slice(0, 3);

  const pendingBookings = bookings.filter((b) => b.status === 'pending').slice(0, 5);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Driver';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={load} />}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.greeting', { name: firstName })}</Text>
            <Text style={styles.subGreeting}>{t('dashboard.subGreeting')}</Text>
          </View>
        </View>

        {/* Route fetch error — surfaces silent failures instead of showing 0 */}
        {routesError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {routesError}</Text>
          </View>
        ) : null}

        {/* Earnings summary */}
        <EarningsSummary
          totalEarnings={stats.totalEarnings}
          deliveredCount={stats.delivered}
        />

        {/* Monthly revenue chart */}
        <RevenueChart data={getMonthlyRevenue()} />

        <View style={styles.statsRow}>
          <StatCard icon="🗓️" label={t('dashboard.upcomingTrips')} value={upcomingRoutes.length} />
          <StatCard icon="📦" label={t('dashboard.pending')} value={!bookingsInitialized ? '—' : stats.pending} accent={Colors.warning} />
          <StatCard icon="🚚" label={t('dashboard.inTransit')} value={!bookingsInitialized ? '—' : stats.inTransit} accent={Colors.secondary} />
        </View>

        {/* Pending bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.pendingBookings')}</Text>
            {stats.pending > 0 && (
              <TouchableOpacity onPress={() => router.push('/(driver)/bookings' as any)}>
                <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {pendingBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>{t('dashboard.noPending')}</Text>
            </View>
          ) : (
            pendingBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => router.push({ pathname: '/driver/bookings/[id]' as any, params: { id: booking.id } })}
              >
                <View style={styles.bookingRow}>
                  <Package size={18} color={Colors.text.secondary} />
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName}>
                      {(booking.sender as { full_name?: string } | undefined)?.full_name ?? 'Sender'}
                    </Text>
                    <Text style={styles.bookingMeta}>
                      {booking.package_weight_kg}kg · {booking.package_category}
                    </Text>
                  </View>
                  <StatusBadge status={booking.status as BookingStatus} showIcon={false} />
                  <ChevronRight size={16} color={Colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Upcoming trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.upcomingTripsSection')}</Text>
            <TouchableOpacity onPress={() => router.push('/(driver)/routes' as any)}>
              <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {upcomingRoutes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>{t('dashboard.noTrips')}</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/driver/routes/new' as any)}
              >
                <Text style={styles.createButtonText}>{t('dashboard.createFirstRoute')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingRoutes.map((route) => (
              <DriverRouteCard
                key={route.id}
                route={route}
                onPress={() => router.push({ pathname: '/driver/routes/[id]' as any, params: { id: route.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  subGreeting: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  seeAll: { fontSize: FontSize.sm, color: Colors.secondary, fontWeight: '600' },
  bookingCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  bookingMeta: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: FontSize.sm, color: '#DC2626' },
  emptyCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: FontSize.base, color: Colors.text.secondary },
  createButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  createButtonText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
});
