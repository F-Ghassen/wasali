import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RoutePromoSectionProps {
  route: any;
}

export function RoutePromoSection({ route }: RoutePromoSectionProps) {
  const savings = useMemo(() => {
    if (!route.promotion_active || !route.promotion_percentage) return 0;
    return route.price_per_kg_eur * (route.promotion_percentage / 100);
  }, [route]);

  const daysLeft = useMemo(() => {
    if (!route.promo_expires_at) return null;
    const expiresAt = new Date(route.promo_expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [route.promo_expires_at]);

  if (!route.promotion_active || !route.promotion_percentage) {
    return null;
  }

  return (
    <View style={s.banner}>
      <View style={s.headerRow}>
        <Sparkles size={18} color={Colors.white} strokeWidth={2} />
        <Text style={s.bannerTitle}>LIMITED TIME OFFER</Text>
      </View>

      <Text style={s.discountAmount}>
        {route.promo_label || `Save €${savings.toFixed(2)}/kg`}
      </Text>

      <View style={s.priceRow}>
        <View style={s.priceBlock}>
          <Text style={s.label}>Original Price</Text>
          <Text style={s.originalPrice}>€{route.price_per_kg_eur.toFixed(2)}</Text>
        </View>

        <Text style={s.arrow}>→</Text>

        <View style={s.priceBlock}>
          <Text style={s.label}>Now</Text>
          <Text style={s.promoPrice}>
            €{(route.price_per_kg_eur * (1 - route.promotion_percentage / 100)).toFixed(2)}
          </Text>
        </View>
      </View>

      {daysLeft !== null && (
        <Text style={s.expiresText}>
          ⏰ Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  bannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  discountAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  priceBlock: {
    flex: 1,
  },

  label: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },

  originalPrice: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
    opacity: 0.7,
    textDecorationLine: 'line-through',
  },

  promoPrice: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
  },

  arrow: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.6,
  },

  expiresText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
});
