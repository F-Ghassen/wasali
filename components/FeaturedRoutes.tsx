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
import { ArrowRight, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type StopType = 'collection' | 'dropoff';

type RouteStop = {
  city_id: string;
  cityName: string;
  country: string;
  flagEmoji: string;
  stopType: StopType;
  stopOrder: number;
  arrivalDate: string;
};

type FeaturedRoute = {
  id: string;
  driverName: string;
  driverRating: number | null;
  driverTrips: number;
  from: string;
  to: string;
  fromCountry: string;
  fromFlag: string;
  toCountry: string;
  toFlag: string;
  originCity: string;
  originDate: string;
  destinationCity: string;
  destinationDate: string;
  departureDate: Date;
  capacityLeft: number;
  totalWeight: number;
  pricePerKg: number;
  pricePromotion: number | null;
  prohibitedItems: string[];
  createdAt: string;
  services: string[];
  stops: RouteStop[];
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
          id,
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
            // All cities come from route_stops
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
                      {route.route_stops && route.route_stops.length > 0
                        ? (cityNames[route.route_stops[0]?.city_id] || 'Origin')
                        : 'Origin'
                      }
                    </Text>
                  </View>
                  <ArrowRight size={20} color={Colors.text.secondary} />
                  <View>
                    <Text style={modalS.label}>To</Text>
                    <Text style={modalS.value}>
                      {route.route_stops && route.route_stops.length > 0
                        ? (cityNames[route.route_stops[route.route_stops.length - 1]?.city_id] || 'Destination')
                        : 'Destination'
                      }
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

  const promotionPercentage = r.pricePromotion ? `${r.pricePromotion}% off` : null;
  const effectivePrice = r.pricePromotion
    ? (r.pricePerKg * (1 - r.pricePromotion / 100)).toFixed(2)
    : r.pricePerKg.toFixed(2);

  return (
    <View style={cardS.card}>
      {/* Row 1: Driver Trust + Price */}
      <View style={cardS.row1}>
        <View style={cardS.driverHighlight}>
          <View style={cardS.avatar}>
            <Text style={cardS.avatarLetter}>{r.driverName[0]}</Text>
          </View>
          <View style={cardS.driverMeta}>
            <Text style={cardS.driverName}>{r.driverName}</Text>
            {r.driverRating !== null ? (
              <Text style={cardS.trustSignal}>⭐ {r.driverRating.toFixed(1)} • {r.driverTrips} trips</Text>
            ) : (
              <Text style={cardS.trustSignal}>New driver</Text>
            )}
          </View>
        </View>

        <View style={cardS.priceHighlight}>
          <View style={cardS.priceDisplay}>
            <Text style={cardS.effectivePrice}>€{effectivePrice}</Text>
            <Text style={cardS.priceUnit}>/kg</Text>
          </View>
          {promotionPercentage && (
            <View style={cardS.promotionBadge}>
              <Text style={cardS.promotionText}>{promotionPercentage}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 2: Route Summary (Origin Country → Destination Country with stops) */}
      <View style={cardS.routeSummary}>
        <View style={cardS.countrySection}>
          <View style={cardS.countryHeader}>
            <View style={cardS.labelWithCountry}>
              <Text style={cardS.countrySectionLabel}>From</Text>
              <Text style={cardS.countryFlagSmall}>
                {r.fromFlag}
              </Text>
              <Text style={cardS.countryNameSmall}>{r.fromCountry}</Text>
            </View>
          </View>
          <View style={cardS.stopsList}>
            <View style={cardS.stopsLabelRow}>
              <Text style={cardS.stopsLabelIcon}>📍</Text>
              <Text style={cardS.stopsSubLabel}>Pickup Locations</Text>
            </View>
            {r.stops
              .filter((s) => s.stopType === 'collection')
              .map((stop) => (
                <View key={`${stop.city_id}-${stop.stopOrder}`} style={cardS.stopChip}>
                  <Text style={cardS.stopChipText}>{stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}</Text>
                </View>
              ))}
          </View>
        </View>

        <View style={cardS.routeArrow}>
          <ArrowRight size={20} color={Colors.primary} strokeWidth={2} />
        </View>

        <View style={cardS.countrySection}>
          <View style={cardS.countryHeader}>
            <View style={cardS.labelWithCountry}>
              <Text style={cardS.countrySectionLabel}>To</Text>
              <Text style={cardS.countryFlagSmall}>
                {r.toFlag}
              </Text>
              <Text style={cardS.countryNameSmall}>{r.toCountry}</Text>
            </View>
          </View>
          <View style={cardS.stopsList}>
            <View style={cardS.stopsLabelRow}>
              <Text style={cardS.stopsLabelIcon}>🎯</Text>
              <Text style={cardS.stopsSubLabel}>Delivery Locations</Text>
            </View>
            {r.stops
              .filter((s) => s.stopType === 'dropoff')
              .map((stop) => (
                <View key={`${stop.city_id}-${stop.stopOrder}`} style={cardS.stopChip}>
                  <Text style={cardS.stopChipText}>{stop.cityName} • {stop.arrivalDate ? format(new Date(stop.arrivalDate), 'MMM d') : 'TBD'}</Text>
                </View>
              ))}
          </View>
        </View>
      </View>


      {/* Row 4: Services + Remaining Weight */}
      {r.services.length > 0 && (
        <View style={cardS.servicesRow}>
          <View style={cardS.servicesTopRow}>
            <Text style={cardS.servicesLabel}>Driver Offered Services</Text>
            <View style={cardS.capacityHighlight}>
              <View style={cardS.capacityLabelRow}>
                <Package size={12} color={Colors.text.secondary} strokeWidth={2} />
                <Text style={cardS.capacityLabel}>{r.capacityLeft} / {r.totalWeight} kg</Text>
              </View>
              <View style={cardS.progressTrack}>
                <View style={[cardS.progressFill, { width: `${Math.round((r.capacityLeft / r.totalWeight) * 100)}%` as any }]} />
              </View>
            </View>
          </View>
          <View style={cardS.servicesList}>
            {r.services.map((svc, idx) => (
              <View key={idx} style={cardS.serviceBadge}>
                <Text style={cardS.serviceName}>{svc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Row 5: Prohibited Items */}
      {r.prohibitedItems.length > 0 && (
        <View style={cardS.prohibitedRow}>
          <Text style={cardS.prohibitedLabel}>⚠️ Prohibited</Text>
          <Text style={cardS.prohibitedList}>{r.prohibitedItems.join(', ')}</Text>
        </View>
      )}

      {/* Row 6: CTA Button */}
      {!r.isFull ? (
        <TouchableOpacity style={cardS.bookBtn} onPress={() => onBook(routeId)} activeOpacity={0.85}>
          <Text style={cardS.bookBtnText}>{t('home.bookSlot')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={cardS.fullBox}>
          <Text style={cardS.fullText}>{t('home.routeFull')}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Helper: map raw Supabase rows → FeaturedRoute ────────────────────────────

async function mapRoutes(rows: any[]): Promise<FeaturedRoute[]> {
  const cityIds = new Set<string>();

  // Collect all city IDs from route_stops
  rows.forEach((r) => {
    r.route_stops?.forEach((stop: any) => {
      if (stop.city_id) cityIds.add(stop.city_id);
    });
  });

  const cityMap = await fetchCitiesForStops(Array.from(cityIds));

  return rows.map((r) => {
    // Sort stops by order
    const sortedStops = r.route_stops?.sort((a: any, b: any) => a.stop_order - b.stop_order) ?? [];
    const originStop = sortedStops.length > 0 ? sortedStops[0] : null;
    const destinationStop = sortedStops.length > 0 ? sortedStops[sortedStops.length - 1] : null;

    const originCityData = originStop ? cityMap.get(originStop.city_id) : null;
    const destinationCityData = destinationStop ? cityMap.get(destinationStop.city_id) : null;

    const originCity = originCityData?.name ?? 'Origin';
    const originCountry = originCityData?.country ?? '';
    const originFlag = originCityData?.flagEmoji ?? '🌍';
    const destinationCity = destinationCityData?.name ?? 'Destination';
    const destinationCountry = destinationCityData?.country ?? '';
    const destinationFlag = destinationCityData?.flagEmoji ?? '🌍';

    const services = r.route_services?.map((svc: any) => svc.service_type).filter(Boolean) ?? [];
    const prohibitedItems = Array.isArray(r.prohibited_items) ? r.prohibited_items : [];

    // Build all stops with city data
    const stops: RouteStop[] = sortedStops.map((stop: any) => {
      const cityData = cityMap.get(stop.city_id);
      const stopType: StopType = stop.stop_type === 'dropoff' ? 'dropoff' : 'collection';
      return {
        city_id: stop.city_id,
        cityName: cityData?.name ?? 'Unknown',
        country: cityData?.country ?? '',
        flagEmoji: cityData?.flagEmoji ?? '🌍',
        stopType: stopType,
        stopOrder: stop.stop_order,
        arrivalDate: stop.arrival_date,
      };
    });

    return {
      id: r.id,
      driverName: r.driver?.full_name ?? 'Driver',
      driverRating: r.driver?.rating ?? null,
      driverTrips: r.driver?.completed_trips ?? 0,
      from: originCity,
      to: destinationCity,
      fromCountry: originCountry,
      fromFlag: originFlag,
      toCountry: destinationCountry,
      toFlag: destinationFlag,
      originCity: originCity,
      originDate: originStop?.arrival_date ?? r.departure_date,
      destinationCity: destinationCity,
      destinationDate: destinationStop?.arrival_date ?? r.departure_date,
      departureDate: new Date(r.departure_date),
      capacityLeft: r.available_weight_kg,
      totalWeight: r.total_weight_kg || r.available_weight_kg,
      pricePerKg: r.price_per_kg_eur,
      pricePromotion: r.promotion_active && r.promotion_percentage ? r.promotion_percentage : null,
      prohibitedItems: prohibitedItems,
      createdAt: r.created_at,
      services: services,
      stops: stops,
      isFull: r.available_weight_kg <= 0,
    };
  });
}

const ROUTE_SELECT = `
  id,
  departure_date, available_weight_kg, total_weight_kg, price_per_kg_eur,
  promotion_percentage, promotion_active, prohibited_items, created_at,
  is_featured, driver:profiles!driver_id(id, full_name, rating, completed_trips),
  route_stops(id, city_id, stop_type, stop_order, arrival_date),
  route_services(id, service_type)
`;

// Fetch detailed cities data for route stops
async function fetchCitiesForStops(cityIds: string[]): Promise<Map<string, { name: string; country: string; flagEmoji: string }>> {
  if (cityIds.length === 0) return new Map();

  const { data: citiesData } = await supabase
    .from('cities')
    .select('id, name, country, flag_emoji')
    .in('id', cityIds);

  return new Map(
    citiesData?.map((c: any) => [c.id, { name: c.name, country: c.country, flagEmoji: c.flag_emoji ?? '🌍' }]) ?? []
  );
}

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
    padding: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
    gap: Spacing.md,
  },

  // Row 1: Price + Capacity + Driver (horizontal layout)
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  priceHighlight: {
    flex: 0.6,
    alignItems: 'flex-end',
    gap: 2,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  effectivePrice: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  promotionBadge: {
    marginTop: 4,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  promotionText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },

  capacityHighlight: {
    gap: 4,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  capacityValue: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  progressTrack: {
    height: 6,
    width: 80,
    backgroundColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  driverHighlight: {
    flex: 0.85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
  },
  driverMeta: {
    flex: 1,
  },
  driverName: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  trustSignal: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 2,
  },

  // Row 2: Route summary (Origin Country → Destination Country)
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  countrySection: {
    flex: 1,
    gap: Spacing.md,
  },
  countryHeader: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  labelWithCountry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  countrySectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countryFlagSmall: {
    fontSize: 18,
  },
  countryNameSmall: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  countryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  countryFlagLarge: {
    fontSize: 24,
  },
  countryNameLarge: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  stopsList: {
    gap: Spacing.sm,
  },
  stopsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  stopsLabelIcon: {
    fontSize: 16,
  },
  stopsSubLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  stopChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  routeArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },


  // Row 4: Services
  servicesRow: {
    gap: Spacing.sm,
  },
  servicesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicesLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  serviceBadge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  serviceName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Row 5: Prohibited items
  prohibitedRow: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  prohibitedLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  prohibitedList: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },

  // CTA Button
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.base,
  },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  fullText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
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
