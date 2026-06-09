import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';

interface RouteTimelineSectionProps {
  route: any;
  cities: any[];
}

export function RouteTimelineSection({ route, cities }: RouteTimelineSectionProps) {
  const getCityName = (cityId: string | null | undefined) => {
    if (!cityId) return '';
    return cities.find((c) => c.id === cityId)?.name || '';
  };

  const pickupStops = useMemo(() => {
    return (route.route_stops ?? []).filter(
      (s: any) => s.is_pickup_available && s.city_id !== route.origin_city_id,
    );
  }, [route]);

  const dropoffStops = useMemo(() => {
    return (route.route_stops ?? []).filter(
      (s: any) => s.is_dropoff_available && s.city_id !== route.destination_city_id,
    );
  }, [route]);

  const originCity = getCityName(route.origin_city_id);
  const destCity = getCityName(route.destination_city_id);

  return (
    <View style={s.card}>
      <Text style={s.title}>Route Timeline</Text>

      {/* Pickup Section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>PICKUP LOCATIONS</Text>

        {/* Origin */}
        <View style={s.stop}>
          <View style={s.dotStart} />
          <View style={s.content}>
            <Text style={s.city}>{originCity}</Text>
            <View style={s.dateRow}>
              <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
              <Text style={s.date}>{formatDateShort(route.departure_date)}</Text>
            </View>
          </View>
        </View>

        {/* Additional Pickup Stops */}
        {pickupStops.map((stop: any) => (
          <View key={stop.id} style={s.stop}>
            <View style={s.dot} />
            <View style={s.content}>
              <Text style={s.city}>{getCityName(stop.city_id)}</Text>
              {stop.arrival_date && (
                <View style={s.dateRow}>
                  <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
                  <Text style={s.date}>{formatDateShort(stop.arrival_date)}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Delivery Section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>DELIVERY LOCATIONS</Text>

        {/* Additional Dropoff Stops */}
        {dropoffStops.map((stop: any) => (
          <View key={stop.id} style={s.stop}>
            <View style={s.dot} />
            <View style={s.content}>
              <Text style={s.city}>{getCityName(stop.city_id)}</Text>
              {stop.arrival_date && (
                <View style={s.dateRow}>
                  <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
                  <Text style={s.date}>{formatDateShort(stop.arrival_date)}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Destination */}
        <View style={s.stop}>
          <View style={s.dotEnd} />
          <View style={s.content}>
            <Text style={s.city}>{destCity}</Text>
            {route.estimated_arrival_date && (
              <View style={s.dateRow}>
                <Clock size={12} color={Colors.text.tertiary} strokeWidth={2} />
                <Text style={s.date}>{formatDateShort(route.estimated_arrival_date)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },

  section: {
    gap: Spacing.md,
  },

  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },

  stop: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },

  dotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },

  dotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },

  content: {
    flex: 1,
    gap: 4,
  },

  city: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  date: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: Spacing.lg,
  },
});
