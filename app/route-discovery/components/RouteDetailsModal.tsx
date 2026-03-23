import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

interface RouteDetailsModalProps {
  routeId: string;
  visible: boolean;
  onClose: () => void;
  onBook: (routeId: string) => void;
}

export function RouteDetailsModal({ routeId, visible, onClose, onBook }: RouteDetailsModalProps) {
  const [route, setRoute]         = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [cityNames, setCityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible || route) return;

    setLoading(true);
    supabase
      .from('routes')
      .select(`
        id,
        departure_date, estimated_arrival_date,
        available_weight_kg, price_per_kg_eur,
        promotion_percentage, promotion_active, prohibited_items,
        driver:profiles!driver_id(
          id, full_name, phone, phone_verified, rating, completed_trips
        ),
        route_stops(
          id, city_id, arrival_date, stop_type, stop_order,
          location_name, location_address,
          is_pickup_available, is_dropoff_available, meeting_point_url
        ),
        route_services(
          id, route_stop_id, service_type, price_eur,
          location_name, location_address, instructions
        ),
        route_payment_methods(id, payment_type, enabled)
      `)
      .eq('id', routeId)
      .single()
      .then(async ({ data, error }) => {
        setLoading(false);
        if (error || !data) return;

        setRoute(data);

        const cityIds = data.route_stops
          ?.map((s: any) => s.city_id)
          .filter(Boolean) as string[];

        if (cityIds.length > 0) {
          const { data: citiesData } = await supabase
            .from('cities')
            .select('id, name')
            .in('id', cityIds);

          const names: Record<string, string> = {};
          citiesData?.forEach((c: any) => { names[c.id] = c.name; });
          setCityNames(names);
        }
      });
  }, [visible, routeId, route]);

  const pickupStops  = route?.route_stops?.filter((s: any) => s.is_pickup_available)
    .sort((a: any, b: any) => a.stop_order - b.stop_order) ?? [];
  const dropoffStops = route?.route_stops?.filter((s: any) => s.is_dropoff_available)
    .sort((a: any, b: any) => a.stop_order - b.stop_order) ?? [];

  const originCity      = cityNames[route?.route_stops?.[0]?.city_id] ?? 'Origin';
  const destinationCity = cityNames[route?.route_stops?.[route?.route_stops?.length - 1]?.city_id] ?? 'Destination';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>Route Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : route ? (
          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

            {/* Route overview */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Route</Text>
              <View style={s.overviewCard}>
                <View style={s.overviewRow}>
                  <View>
                    <Text style={s.label}>From</Text>
                    <Text style={s.value}>{originCity}</Text>
                  </View>
                  <ArrowRight size={20} color={Colors.text.secondary} />
                  <View>
                    <Text style={s.label}>To</Text>
                    <Text style={s.value}>{destinationCity}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Schedule & price */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Schedule & Price</Text>
              <View style={[s.infoRow, { marginBottom: Spacing.md }]}>
                <Text style={s.label}>Departure</Text>
                <Text style={s.value}>
                  {format(new Date(route.departure_date), 'EEE, MMM d, yyyy • HH:mm')}
                </Text>
              </View>
              {route.estimated_arrival_date && (
                <View style={[s.infoRow, { marginBottom: Spacing.md }]}>
                  <Text style={s.label}>Est. Arrival</Text>
                  <Text style={s.value}>
                    {format(new Date(route.estimated_arrival_date), 'EEE, MMM d, yyyy')}
                  </Text>
                </View>
              )}
              <View style={s.infoRow}>
                <Text style={s.label}>Price per Kg</Text>
                <View style={s.priceBadge}>
                  <Text style={s.priceValue}>€{route.price_per_kg_eur}</Text>
                </View>
              </View>
            </View>

            {/* Driver */}
            {route.driver && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Driver</Text>
                <View style={s.driverCard}>
                  <View style={s.driverAvatar}>
                    <Text style={s.driverInitial}>
                      {route.driver.full_name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.driverName}>{route.driver.full_name ?? 'Unknown'}</Text>
                    {route.driver.phone_verified && (
                      <Text style={s.driverMeta}>✓ Phone verified</Text>
                    )}
                    {route.driver.completed_trips > 0 && (
                      <Text style={s.driverMeta}>{route.driver.completed_trips} completed trips</Text>
                    )}
                  </View>
                  {route.driver.rating > 0 && (
                    <View style={s.ratingBadge}>
                      <Text style={s.ratingText}>⭐ {route.driver.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Capacity */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Capacity</Text>
              <View style={s.infoRow}>
                <Text style={s.label}>Available Weight</Text>
                <Text style={s.value}>{route.available_weight_kg} kg</Text>
              </View>
            </View>

            {/* Pickup stops */}
            {pickupStops.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Pickup Locations</Text>
                {pickupStops.map((stop: any) => (
                  <View key={stop.id} style={[s.stopCard, { marginBottom: Spacing.md }]}>
                    <View style={s.stopHeader}>
                      <Text style={s.stopCity}>{cityNames[stop.city_id] ?? stop.city_id}</Text>
                      {stop.arrival_date && (
                        <Text style={s.stopDate}>{format(new Date(stop.arrival_date), 'MMM d')}</Text>
                      )}
                    </View>
                    {stop.location_name    && <Text style={s.stopDetail}>{stop.location_name}</Text>}
                    {stop.location_address && <Text style={s.stopAddress}>{stop.location_address}</Text>}
                    {stop.meeting_point_url && <Text style={s.meetingPoint}>Meeting point available</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Dropoff stops */}
            {dropoffStops.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Delivery Locations</Text>
                {dropoffStops.map((stop: any) => (
                  <View key={stop.id} style={[s.stopCard, { marginBottom: Spacing.md }]}>
                    <View style={s.stopHeader}>
                      <Text style={s.stopCity}>{cityNames[stop.city_id] ?? stop.city_id}</Text>
                      {stop.arrival_date && (
                        <Text style={s.stopDate}>{format(new Date(stop.arrival_date), 'MMM d')}</Text>
                      )}
                    </View>
                    {stop.location_name    && <Text style={s.stopDetail}>{stop.location_name}</Text>}
                    {stop.location_address && <Text style={s.stopAddress}>{stop.location_address}</Text>}
                  </View>
                ))}
              </View>
            )}

            {route.prohibited_items && route.prohibited_items.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Prohibited Items</Text>
                <View style={s.prohibitedBox}>
                  <Text style={s.prohibitedText}>⚠️ {route.prohibited_items.join(', ')}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={s.bookBtn}
              onPress={() => { onClose(); onBook(routeId); }}
              activeOpacity={0.85}
            >
              <Text style={s.bookBtnText}>Book slot →</Text>
            </TouchableOpacity>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text.primary },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 24, color: Colors.text.secondary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.base, paddingTop: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary,
    marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  overviewCard: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  label: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  value: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md,
  },
  priceBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  priceValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
  driverName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  driverMeta: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  ratingBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  ratingText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  stopCard: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  stopCity: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  stopDate: { fontSize: FontSize.xs, color: Colors.text.secondary },
  stopDetail: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 },
  stopAddress: { fontSize: FontSize.xs, color: Colors.text.secondary, marginBottom: 8 },
  meetingPoint: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  prohibitedBox: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  prohibitedText: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '500' },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
