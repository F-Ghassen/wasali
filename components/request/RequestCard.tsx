import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDate, formatPrice } from '@/utils/formatters';
import type { ShippingRequestWithOffers } from '@/types/models';

interface RequestCardProps {
  request: ShippingRequestWithOffers;
  onPress: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: Colors.success, bg: Colors.successLight },
  offer_accepted: { label: 'Offer Accepted', color: Colors.primary, bg: Colors.primaryLight },
  expired: { label: 'Expired', color: Colors.text.secondary, bg: Colors.background.tertiary },
  cancelled: { label: 'Cancelled', color: Colors.error, bg: Colors.errorLight },
};

export function RequestCard({ request, onPress }: RequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.open;
  const offerCount = request.shipping_request_offers?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.route}>
          Destination → Destination
        </Text>
        <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.badgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.meta}>{request.package_weight_kg} kg · {request.package_category}</Text>
        {request.max_budget_eur && (
          <Text style={styles.budget}>Budget: {formatPrice(request.max_budget_eur)}</Text>
        )}
      </View>

      {offerCount > 0 && (
        <View style={styles.offersBanner}>
          <Text style={styles.offersText}>
            {offerCount} offer{offerCount !== 1 ? 's' : ''} received
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  route: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: FontSize.sm, color: Colors.text.secondary },
  budget: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  offersBanner: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  offersText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.secondary },
});
