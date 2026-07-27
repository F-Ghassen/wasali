import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Phone, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface SenderInfoCardProps {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  rating?: number | null;
  completedTrips?: number | null;
}

export function SenderInfoCard({ fullName, phone, rating, completedTrips }: SenderInfoCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.sender')}</Text>
      <View style={styles.nameRow}>
        <Text style={styles.senderName}>{fullName ?? '—'}</Text>
        {rating != null && rating > 0 ? (
          <View style={styles.ratingRow}>
            <Star size={12} color={Colors.gold} fill={Colors.gold} strokeWidth={0} />
            <Text style={styles.ratingText}>
              {rating.toFixed(1)}
              {completedTrips != null ? ` · ${completedTrips}` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.noRatingBadge}>
            <Text style={styles.noRatingText}>{t('bookingDetail.labels.noRatingYet')}</Text>
          </View>
        )}
      </View>
      {phone && (
        <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Phone size={14} color={Colors.secondary} />
          <Text style={styles.phoneText}>{phone}</Text>
        </TouchableOpacity>
      )}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  senderName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  noRatingBadge: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  noRatingText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.tertiary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  phoneText: { fontSize: FontSize.base, color: Colors.secondary, fontWeight: '500' },
});
