import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPrice } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import type { BookingWithRoute } from '@/types/models';
import type { BookingStatus } from '@/constants/bookingStatus';
import { BOOKING_STATUS_CONFIG } from '@/constants/bookingStatus';

const STATUS_ORDER: BookingStatus[] = [
  'pending',
  'confirmed',
  'in_transit',
  'delivered',
];

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingWithRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, route:routes(*, route_stops(*))')
        .eq('id', id)
        .single();
      setBooking(data as unknown as BookingWithRoute);
      setIsLoading(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => setBooking((prev) => prev ? { ...prev, ...payload.new } : null)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const currentStatusIndex = STATUS_ORDER.indexOf(booking.status as BookingStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <Text style={styles.route}>
              {booking.route?.origin_city} → {booking.route?.destination_city}
            </Text>
            <StatusBadge status={booking.status as BookingStatus} />
          </View>
          <Text style={styles.date}>
            Departure: {booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—'}
          </Text>
        </View>

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shipment Status</Text>
          {STATUS_ORDER.map((status, i) => {
            const config = BOOKING_STATUS_CONFIG[status];
            const isCompleted = i < currentStatusIndex;
            const isActive = i === currentStatusIndex;
            return (
              <View key={status} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.dot,
                    isActive && styles.activeDot,
                    isCompleted && styles.completedDot,
                  ]}>
                    <Text style={styles.dotText}>{isCompleted ? '✓' : config.icon}</Text>
                  </View>
                  {i < STATUS_ORDER.length - 1 && (
                    <View style={[styles.line, (isCompleted || isActive) && styles.activeLine]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, isActive && styles.activeTimelineLabel]}>
                  {config.label}
                </Text>
              </View>
            );
          })}
        </View>

        {booking.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Confirmation</Text>
            <Text style={styles.qrHint}>Show this QR code to your driver to confirm the booking</Text>
            <View style={styles.qrContainer}>
              <QRCode value={booking.id} size={180} />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Package Info</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Weight</Text><Text style={styles.infoValue}>{booking.package_weight_kg} kg</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Category</Text><Text style={styles.infoValue}>{booking.package_category}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Total Paid</Text><Text style={[styles.infoValue, styles.price]}>{formatPrice(booking.price_eur)}</Text></View>
        </View>

        {booking.status === 'delivered' && (
          <Button
            label="Rate Driver"
            onPress={() => router.push(`/post-delivery/rate/${booking.id}`)}
            variant="outline"
            size="lg"
          />
        )}

        {(booking.status === 'confirmed' || booking.status === 'in_transit') && (
          <Button
            label="Report a Problem"
            onPress={() => router.push(`/post-delivery/dispute/${booking.id}`)}
            variant="ghost"
            size="md"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  content: { padding: Spacing.base, gap: Spacing.base },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  route: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  date: { fontSize: FontSize.sm, color: Colors.text.secondary },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: Spacing.md },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  activeDot: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  completedDot: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  dotText: { fontSize: 14 },
  line: { width: 2, height: 24, backgroundColor: Colors.border.light, marginVertical: 4 },
  activeLine: { backgroundColor: Colors.primary },
  timelineLabel: { fontSize: FontSize.base, color: Colors.text.tertiary, paddingTop: 8, paddingBottom: 28 },
  activeTimelineLabel: { color: Colors.primary, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  infoLabel: { fontSize: FontSize.base, color: Colors.text.secondary },
  infoValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  price: { color: Colors.primary },
  qrHint: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.md },
  qrContainer: { alignItems: 'center', paddingVertical: Spacing.md },
});
