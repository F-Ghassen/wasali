import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeaturedRoute = {
  id: string;
  driverName: string;
  from: string;
  to: string;
  departureDate: Date;
  capacityLeft: number;
  pricePerKg: number;
  isFull: boolean;
};

// ─── Route Details Modal ──────────────────────────────────────────────────────

function RouteDetailsModal({ routeId, visible, onClose }: { routeId: string; visible: boolean; onClose: () => void }) {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cityNames, setCityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && !route) {
      setLoading(true);
      supabase
        .from('routes')
        .select(`
          id, origin_city_id, destination_city_id,
          departure_date, estimated_arrival_date,
          available_weight_kg, price_per_kg_eur,
          promotion_percentage, promotion_active,
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
          if (!error && data) {
            setRoute(data);
            const cityIds: string[] = [];
            if (data.origin_city_id) cityIds.push(data.origin_city_id);
            if (data.destination_city_id) cityIds.push(data.destination_city_id);
            data.route_stops?.forEach((s: any) => { if (s.city_id) cityIds.push(s.city_id); });

            if (cityIds.length > 0) {
              const { data: citiesData } = await supabase
                .from('cities')
                .select('id, name')
                .in('id', cityIds);

              const names: Record<string, string> = {};
              citiesData?.forEach((c: any) => { names[c.id] = c.name; });
              setCityNames(names);
            }
          }
        });
    }
  }, [visible, routeId, route]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={modalS.container}>
        <View style={modalS.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={modalS.closeBtn}>
            <Text style={modalS.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={modalS.title}>Route Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={modalS.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : route ? (
          <ScrollView style={modalS.content} showsVerticalScrollIndicator={false}>
            {/* Route Overview */}
            <View style={modalS.section}>
              <Text style={modalS.sectionTitle}>Route</Text>
              <View style={modalS.overviewCard}>
                <View style={modalS.overviewRow}>
                  <View>
                    <Text style={modalS.label}>From</Text>
                    <Text style={modalS.value}>
                      {route.origin_city_id ? cityNames[route.origin_city_id] : 'Origin'}
                    </Text>
                  </View>
                  <ArrowRight size={20} color={Colors.text.secondary} />
                  <View>
                    <Text style={modalS.label}>To</Text>
                    <Text style={modalS.value}>
                      {route.destination_city_id ? cityNames[route.destination_city_id] : 'Destination'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dates & Price */}
            <View style={modalS.section}>
              <Text style={modalS.sectionTitle}>Schedule & Price</Text>
              <View style={[modalS.infoRow, { marginBottom: Spacing.md }]}>
                <Text style={modalS.label}>Departure</Text>
                <Text style={modalS.value}>{format(new Date(route.departure_date), 'EEE, MMM d, yyyy • HH:mm')}</Text>
              </View>
              {route.estimated_arrival_date && (
                <View style={[modalS.infoRow, { marginBottom: Spacing.md }]}>
                  <Text style={modalS.label}>Est. Arrival</Text>
                  <Text style={modalS.value}>{format(new Date(route.estimated_arrival_date), 'EEE, MMM d, yyyy')}</Text>
                </View>
              )}
              <View style={modalS.infoRow}>
                <Text style={modalS.label}>Price per Kg</Text>
                <View style={modalS.priceBadge}>
                  <Text style={modalS.priceValue}>€{route.price_per_kg_eur}</Text>
                </View>
              </View>
            </View>

            {/* Driver */}
            {route.driver && (
              <View style={modalS.section}>
                <Text style={modalS.sectionTitle}>Driver</Text>
                <View style={modalS.driverCard}>
                  <View style={modalS.driverAvatar}>
                    <Text style={modalS.driverInitial}>{route.driver.full_name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalS.driverName}>{route.driver.full_name || 'Unknown'}</Text>
                    {route.driver.phone_verified && (
                      <Text style={modalS.driverMeta}>✓ Phone verified</Text>
                    )}
                    {route.driver.completed_trips > 0 && (
                      <Text style={modalS.driverMeta}>{route.driver.completed_trips} completed trips</Text>
                    )}
                  </View>
                  {route.driver.rating > 0 && (
                    <View style={modalS.ratingBadge}>
                      <Text style={modalS.ratingText}>⭐ {route.driver.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Capacity */}
            <View style={modalS.section}>
              <Text style={modalS.sectionTitle}>Capacity</Text>
              <View style={modalS.infoRow}>
                <Text style={modalS.label}>Available Weight</Text>
                <Text style={modalS.value}>{route.available_weight_kg} kg</Text>
              </View>
            </View>

            {/* Pickup Stops */}
            {route.route_stops?.some((s: any) => s.is_pickup_available) && (
              <View style={modalS.section}>
                <Text style={modalS.sectionTitle}>Pickup Locations</Text>
                {route.route_stops
                  .filter((s: any) => s.is_pickup_available)
                  .sort((a: any, b: any) => a.stop_order - b.stop_order)
                  .map((stop: any) => (
                    <View key={stop.id} style={[modalS.stopCard, { marginBottom: Spacing.md }]}>
                      <View style={modalS.stopHeader}>
                        <Text style={modalS.stopCity}>{cityNames[stop.city_id] || stop.city_id}</Text>
                        {stop.arrival_date && (
                          <Text style={modalS.stopDate}>{format(new Date(stop.arrival_date), 'MMM d')}</Text>
                        )}
                      </View>
                      {stop.location_name && <Text style={modalS.stopDetail}>{stop.location_name}</Text>}
                      {stop.location_address && <Text style={modalS.stopAddress}>{stop.location_address}</Text>}
                      {stop.meeting_point_url && <Text style={modalS.meetingPoint}>Meeting point available</Text>}
                    </View>
                  ))}
              </View>
            )}

            {/* Dropoff Stops */}
            {route.route_stops?.some((s: any) => s.is_dropoff_available) && (
              <View style={modalS.section}>
                <Text style={modalS.sectionTitle}>Delivery Locations</Text>
                {route.route_stops
                  .filter((s: any) => s.is_dropoff_available)
                  .sort((a: any, b: any) => a.stop_order - b.stop_order)
                  .map((stop: any) => (
                    <View key={stop.id} style={[modalS.stopCard, { marginBottom: Spacing.md }]}>
                      <View style={modalS.stopHeader}>
                        <Text style={modalS.stopCity}>{cityNames[stop.city_id] || stop.city_id}</Text>
                        {stop.arrival_date && (
                          <Text style={modalS.stopDate}>{format(new Date(stop.arrival_date), 'MMM d')}</Text>
                        )}
                      </View>
                      {stop.location_name && <Text style={modalS.stopDetail}>{stop.location_name}</Text>}
                      {stop.location_address && <Text style={modalS.stopAddress}>{stop.location_address}</Text>}
                    </View>
                  ))}
              </View>
            )}

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Featured Route Card ──────────────────────────────────────────────────────

function FeaturedRouteCard({ route: r, routeId, onBook }: { route: FeaturedRoute; routeId: string; onBook: (routeId: string) => void }) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <View style={cardS.card}>
        <View style={cardS.featuredBadge}>
          <Text style={cardS.featuredBadgeText}>Featured</Text>
        </View>
        <View style={cardS.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={cardS.route}>{r.from} → {r.to}</Text>
            <Text style={cardS.departure}>Departs {format(r.departureDate, 'EEE, MMM d')}</Text>
          </View>
          <View style={cardS.pricePill}>
            <Text style={cardS.price}>€{r.pricePerKg}</Text>
            <Text style={cardS.perKg}>/kg</Text>
          </View>
        </View>

        <View style={cardS.driverRow}>
          <View style={cardS.avatar}>
            <Text style={cardS.avatarLetter}>{r.driverName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cardS.driverName}>{r.driverName}</Text>
            <Text style={cardS.driverMeta}>{r.capacityLeft} kg available</Text>
          </View>
        </View>

        {r.isFull ? (
          <View style={cardS.fullBox}>
            <Text style={cardS.fullText}>{t('home.routeFull')}</Text>
          </View>
        ) : (
          <View style={cardS.buttonRow}>
            <TouchableOpacity style={[cardS.secondaryBtn, { flex: 1 }]} onPress={() => setShowDetails(true)} activeOpacity={0.7}>
              <Text style={cardS.secondaryBtnText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cardS.primaryBtn, { flex: 1 }]} onPress={() => onBook(routeId)} activeOpacity={0.85}>
              <Text style={cardS.primaryBtnText}>{t('home.bookSlot')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <RouteDetailsModal routeId={routeId} visible={showDetails} onClose={() => setShowDetails(false)} />
    </>
  );
}

// ─── Helper: map raw Supabase rows → FeaturedRoute ────────────────────────────

async function mapRoutes(rows: any[]): Promise<FeaturedRoute[]> {
  const cityIds = new Set<string>();
  rows.forEach((r) => {
    if (r.origin_city_id) cityIds.add(r.origin_city_id);
    if (r.destination_city_id) cityIds.add(r.destination_city_id);
  });

  const { data: citiesData } = await supabase
    .from('cities')
    .select('id, name, country')
    .in('id', Array.from(cityIds));

  const cityMap = new Map(citiesData?.map((c: any) => [c.id, c.name]) ?? []);

  return rows.map((r) => ({
    id: r.id,
    driverName: r.driver?.full_name ?? 'Driver',
    from: r.origin_city_id ? (cityMap.get(r.origin_city_id) ?? 'Origin') : 'Origin',
    to: r.destination_city_id ? (cityMap.get(r.destination_city_id) ?? 'Destination') : 'Destination',
    departureDate: new Date(r.departure_date),
    capacityLeft: r.available_weight_kg,
    pricePerKg: r.price_per_kg_eur,
    isFull: r.available_weight_kg <= 0,
  }));
}

const ROUTE_SELECT = `
  id, origin_city_id, destination_city_id,
  departure_date, available_weight_kg, price_per_kg_eur,
  is_featured, driver:profiles!driver_id(id, full_name, rating, avatar_url)
`;

// ─── FeaturedRoutes (main export) ─────────────────────────────────────────────

export default function FeaturedRoutes() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const slideY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [routes, setRoutes] = useState<FeaturedRoute[]>([]);

  const fetch = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: featured } = await supabase
        .from('routes')
        .select(ROUTE_SELECT)
        .eq('status', 'active')
        .eq('is_featured', true)
        .gte('available_weight_kg', 1)
        .gte('departure_date', today)
        .order('departure_date', { ascending: true })
        .limit(6);

      if (featured && featured.length > 0) {
        setRoutes(await mapRoutes(featured));
        return;
      }

      // Fallback: cheapest upcoming routes
      const { data: fallback } = await supabase
        .from('routes')
        .select(ROUTE_SELECT)
        .eq('status', 'active')
        .gte('available_weight_kg', 1)
        .gte('departure_date', today)
        .order('price_per_kg_eur', { ascending: true })
        .limit(6);

      if (fallback) setRoutes(await mapRoutes(fallback));
    } catch (err) {
      console.error('FeaturedRoutes: fetch failed', err);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (routes.length === 0) return;
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 8, delay: 300 }),
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true, delay: 300 }),
    ]).start();
  }, [routes.length]);

  if (routes.length === 0) return null;

  const cols = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  const GAP = Spacing.md;
  const visible = routes.slice(0, cols * 2);
  const rows: FeaturedRoute[][] = [];
  for (let i = 0; i < visible.length; i += cols) rows.push(visible.slice(i, i + cols));

  const handleBook = (routeId: string) =>
    router.push({ pathname: '/booking', params: { routeId } } as any);

  const handleSeeAll = () =>
    router.push('/(tabs)/routes/results' as any);

  return (
    <Animated.View style={[s.section, { transform: [{ translateY: slideY }], opacity }]}>
      <Text style={s.sectionLabel}>{t('home.featuredRoutes')}</Text>

      <View style={{ gap: GAP }}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={[s.row, { gap: GAP }]}>
            {row.map((route) => (
              <View key={route.id} style={{ flex: 1 }}>
                <FeaturedRouteCard route={route} routeId={route.id} onBook={handleBook} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.seeAllBtn} onPress={handleSeeAll} activeOpacity={0.7}>
        <Text style={s.seeAllBtnText}>{t('home.showAllRoutes')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: { gap: Spacing.md },
  row: { flexDirection: 'row' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.text.tertiary,
  },
  seeAllBtn: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  seeAllBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },
});

const cardS = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.gold, letterSpacing: 0.3 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  route: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  departure: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  price: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  perKg: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginLeft: 2 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary },
  driverName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  driverMeta: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryBtn: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  secondaryBtnText: { color: Colors.text.primary, fontWeight: '600', fontSize: FontSize.base },
});

const modalS = StyleSheet.create({
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
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  priceBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  priceValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
  driverName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  driverMeta: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  ratingBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  ratingText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  stopCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stopCity: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  stopDate: { fontSize: FontSize.xs, color: Colors.text.secondary },
  stopDetail: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 },
  stopAddress: { fontSize: FontSize.xs, color: Colors.text.secondary, marginBottom: 8 },
  meetingPoint: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
});
