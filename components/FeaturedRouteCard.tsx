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
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { getCountryFlag } from '@/lib/flagImages';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeaturedRoute = {
  id: string;
  driverName: string;
  driverRating: number | null;
  driverTrips: number;
  from: string;
  to: string;
  fromCountry: string;
  toCountry: string;
  originCity: string;
  originDate: string;
  destinationCity: string;
  destinationDate: string;
  departureDate: Date;
  capacityLeft: number;
  pricePerKg: number;
  pricePromotion: number | null;
  prohibitedItems: string[];
  createdAt: string;
  services: string[];
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
        .then(async ({ data, error }: any) => {
          setLoading(false);
          if (!error && data) {
            setRoute(data);
            const cityIds: string[] = [];
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

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Featured Route Card ──────────────────────────────────────────────────────

export interface FeaturedRouteCardProps {
  route: FeaturedRoute;
  routeId: string;
  onBook: (routeId: string) => void;
}

export function FeaturedRouteCard({ route: r, routeId, onBook }: FeaturedRouteCardProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const promotionPercentage = r.pricePromotion ? `${r.pricePromotion}% off` : null;
  const effectivePrice = r.pricePromotion
    ? (r.pricePerKg * (1 - r.pricePromotion / 100)).toFixed(2)
    : r.pricePerKg.toFixed(2);

  return (
    <>
      <View style={cardS.card}>
        {/* Row 1: Driver Info + Price & Promotion */}
        <View style={cardS.row1}>
          <View style={cardS.driverInfo}>
            <View style={cardS.avatar}>
              <Text style={cardS.avatarLetter}>{r.driverName[0]}</Text>
            </View>
            <View style={cardS.driverDetails}>
              <Text style={cardS.driverName}>{r.driverName}</Text>
              <View style={cardS.ratingRow}>
                {r.driverRating !== null ? (
                  <>
                    <Text style={cardS.rating}>⭐ {r.driverRating.toFixed(1)}</Text>
                    <Text style={cardS.trips}>{r.driverTrips} trips</Text>
                  </>
                ) : (
                  <>
                    <Text style={cardS.noRating}>No rating yet</Text>
                    <Text style={cardS.trips}>0 trips</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={cardS.priceSection}>
            <Text style={cardS.effectivePrice}>€{effectivePrice}</Text>
            <Text style={cardS.priceUnit}>/kg</Text>
            {promotionPercentage && <Text style={cardS.promotion}>{promotionPercentage}</Text>}
          </View>
        </View>

        {/* Row 2: Origin Country → Destination Country */}
        <View style={cardS.row2}>
          <View style={cardS.countryCol}>
            <Text style={cardS.flag}>{getCountryFlag(r.fromCountry)}</Text>
            <Text style={cardS.countryName}>{r.fromCountry}</Text>
          </View>
          <ArrowRight size={18} color={Colors.text.secondary} strokeWidth={3} />
          <View style={cardS.countryCol}>
            <Text style={cardS.flag}>{getCountryFlag(r.toCountry)}</Text>
            <Text style={cardS.countryName}>{r.toCountry}</Text>
          </View>
        </View>

        {/* Row 3: Route Stops (origin → destination) */}
        <View style={cardS.row3}>
          <View style={cardS.stopCol}>
            <Text style={cardS.stopCity}>{r.originCity}</Text>
            <Text style={cardS.stopDate}>{format(new Date(r.originDate), 'MMM d')}</Text>
          </View>
          <ArrowRight size={16} color={Colors.text.secondary} strokeWidth={2.5} />
          <View style={cardS.stopCol}>
            <Text style={cardS.stopCity}>{r.destinationCity}</Text>
            <Text style={cardS.stopDate}>{format(new Date(r.destinationDate), 'MMM d')}</Text>
          </View>
        </View>

        {/* Row 4: Services + Available Weight */}
        <View style={cardS.row4}>
          <View style={cardS.services}>
            {r.services.map((svc, idx) => (
              <View key={idx} style={cardS.serviceBadge}>
                <Text style={cardS.serviceName}>{svc}</Text>
              </View>
            ))}
          </View>
          <View style={cardS.capacityBadge}>
            <Text style={cardS.capacity}>{r.capacityLeft} kg</Text>
          </View>
        </View>

        {/* Row 5: Prohibited Items & Publication Date */}
        {(r.prohibitedItems.length > 0 || r.createdAt) && (
          <View style={cardS.row5}>
            {r.prohibitedItems.length > 0 && (
              <View style={cardS.prohibitedSection}>
                <Text style={cardS.prohibitedLabel}>Prohibited Items:</Text>
                <Text style={cardS.prohibitedList}>{r.prohibitedItems.join(', ')}</Text>
              </View>
            )}
            <Text style={cardS.publishDate}>Published {format(new Date(r.createdAt), 'MMM d')}</Text>
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

      <RouteDetailsModal routeId={routeId} visible={showDetails} onClose={() => setShowDetails(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary },
  driverDetails: { flex: 1 },
  driverName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  ratingRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 2 },
  rating: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  noRating: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  trips: { fontSize: FontSize.xs, color: Colors.text.secondary },
  priceSection: {
    alignItems: 'flex-end',
  },
  effectivePrice: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, color: Colors.text.secondary },
  promotion: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gold, marginTop: 2 },

  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  countryCol: {
    alignItems: 'center',
    flex: 1,
  },
  flag: { fontSize: 24, marginBottom: 2 },
  countryName: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.primary },

  row3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  stopCol: {
    alignItems: 'center',
    flex: 1,
  },
  stopCity: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  stopDate: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  row4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  services: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  serviceBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  serviceName: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.white },
  capacityBadge: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  capacity: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },

  row5: {
    gap: Spacing.xs,
  },
  prohibitedSection: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  prohibitedLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.primary },
  prohibitedList: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  publishDate: { fontSize: FontSize.xs, color: Colors.text.tertiary, fontStyle: 'italic' },

  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  fullBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  fullText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500', textAlign: 'center' },
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
});
