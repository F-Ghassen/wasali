import React, { useEffect } from 'react';
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
import { format } from 'date-fns';
import { ChevronRight, MapPin, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { StatCard } from '@/components/driver/StatCard';
import { EarningsSummary } from '@/components/driver/EarningsSummary';
import { RevenueChart } from '@/components/driver/RevenueChart';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BookingStatus } from '@/constants/bookingStatus';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { routes, fetchRoutes, isLoading: routesLoading } = useDriverRouteStore();
  const { bookings, stats, fetchBookings, getMonthlyRevenue, isLoading: bookingsLoading } = useDriverBookingStore();

  const isRefreshing = routesLoading || bookingsLoading;

  const load = () => {
    if (!profile) return;
    fetchRoutes(profile.id, 'active');
    fetchBookings(profile.id, 'all');
  };

  useEffect(() => { load(); }, [profile?.id]);

  const upcomingRoutes = routes
    .filter((r) => r.status === 'active' && r.departure_date >= new Date().toISOString().split('T')[0])
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
            <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>Here's your driver overview</Text>
          </View>
        </View>

        {/* Earnings summary */}
        <EarningsSummary
          totalEarnings={stats.totalEarnings}
          deliveredCount={stats.delivered}
        />

        {/* Monthly revenue chart */}
        <RevenueChart data={getMonthlyRevenue()} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="🗓️" label="Upcoming Trips" value={upcomingRoutes.length} />
          <StatCard icon="📦" label="Pending" value={stats.pending} accent={Colors.warning} />
          <StatCard icon="🚚" label="In Transit" value={stats.inTransit} accent={Colors.secondary} />
        </View>

        {/* Pending bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Bookings</Text>
            {stats.pending > 0 && (
              <TouchableOpacity onPress={() => router.push('/(driver-tabs)/bookings' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {pendingBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No pending bookings</Text>
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
            <Text style={styles.sectionTitle}>Upcoming Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(driver-tabs)/routes' as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {upcomingRoutes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>No upcoming trips</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/driver/routes/new' as any)}
              >
                <Text style={styles.createButtonText}>Create your first route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => router.push({ pathname: '/driver/routes/[id]' as any, params: { id: route.id } })}
              >
                <View style={styles.routeRow}>
                  <MapPin size={18} color={Colors.text.secondary} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeTitle}>
                      {route.origin_city} → {route.destination_city}
                    </Text>
                    <Text style={styles.routeMeta}>
                      {format(new Date(route.departure_date), 'MMM d, yyyy')} · {route.available_weight_kg}kg available
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.text.tertiary} />
                </View>
              </TouchableOpacity>
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
  routeCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeInfo: { flex: 1 },
  routeTitle: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  routeMeta: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
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
