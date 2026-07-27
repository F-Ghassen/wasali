import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDate } from '@/utils/formatters';

const KNOWN_CATEGORY_KEYS = ['clothing', 'food', 'electronics', 'documents', 'mixed', 'other'];

interface PackageInfoCardProps {
  /** All categories the sender selected (bookings.package_categories) — a
   *  booking's package_category (singular) column only ever held the first
   *  one, silently dropping the rest of a multi-select (migration 054). */
  categories: string[];
  weightKg: number;
  declaredValueEur?: number | null;
  estimatedCollectionDate?: string | null;
  requestedAt?: string | null;
}

export function PackageInfoCard({ categories, weightKg, declaredValueEur, estimatedCollectionDate, requestedAt }: PackageInfoCardProps) {
  const { t } = useTranslation();

  const categoryLabel = (key: string) =>
    KNOWN_CATEGORY_KEYS.includes(key) ? t(`booking.packageTypes.${key}`) : key;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.package')}</Text>
      <View style={styles.gridItem}>
        <Text style={styles.gridLabel}>{t('bookingDetail.labels.category')}</Text>
        <View style={styles.categoryChips}>
          {categories.map((c) => (
            <View key={c} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{categoryLabel(c)}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>{t('bookingDetail.labels.weight')}</Text>
          <Text style={styles.gridValue}>{weightKg} kg</Text>
        </View>
        {declaredValueEur != null && (
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>{t('bookingDetail.labels.declaredValue')}</Text>
            <Text style={styles.gridValue}>€{declaredValueEur}</Text>
          </View>
        )}
        {estimatedCollectionDate && (
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>{t('bookingDetail.labels.estimatedCollection')}</Text>
            <Text style={styles.gridValue}>{formatDate(estimatedCollectionDate)}</Text>
          </View>
        )}
        {requestedAt && (
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>{t('bookingDetail.labels.requestedOn')}</Text>
            <Text style={styles.gridValue}>{formatDate(requestedAt)}</Text>
          </View>
        )}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { minWidth: '45%' },
  gridLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 2 },
  gridValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  categoryChip: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  categoryChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
});
