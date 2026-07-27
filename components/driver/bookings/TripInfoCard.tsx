import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDate } from '@/utils/formatters';
import type { DriverBookingDetail } from '@/app/driver/bookings/types/index';
import { getOriginCity, getDestinationCity, getOriginFlag, getDestinationFlag } from '@/app/driver/bookings/utils/routeCities';

interface TripInfoCardProps {
  booking: DriverBookingDetail;
}

export function TripInfoCard({ booking }: TripInfoCardProps) {
  const { t } = useTranslation();

  const originCity = getOriginCity(booking);
  const destCity = getDestinationCity(booking);
  const originFlag = getOriginFlag(booking);
  const destFlag = getDestinationFlag(booking);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.trip')}</Text>
      <View style={styles.routeRow}>
        <View style={styles.cityBlock}>
          <Text style={styles.cityFlag}>{originFlag}</Text>
          <Text style={styles.cityName}>{originCity}</Text>
          <Text style={styles.cityDate}>
            {booking.route?.departure_date ? formatDate(booking.route.departure_date) : '—'}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.cityBlock, styles.cityBlockRight]}>
          <Text style={styles.cityFlag}>{destFlag}</Text>
          <Text style={styles.cityName}>{destCity}</Text>
          <Text style={styles.cityDate}>
            {booking.route?.estimated_arrival_date ? formatDate(booking.route.estimated_arrival_date) : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityBlock: { alignItems: 'flex-start', flex: 1 },
  cityBlockRight: { alignItems: 'flex-end' },
  cityFlag: { fontSize: 22, marginBottom: 2 },
  cityName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  cityDate: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  arrow: { fontSize: FontSize.base, color: Colors.text.tertiary, paddingHorizontal: Spacing.sm },
});
