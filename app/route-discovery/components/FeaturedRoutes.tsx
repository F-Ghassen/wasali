import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useFeaturedRoutes } from '@/app/route-discovery/hooks/useFeaturedRoutes';
import { FeaturedRouteCard } from '@/app/route-discovery/components/FeaturedRouteCard';
import { RouteDetailsModal } from '@/app/route-discovery/components/RouteDetailsModal';
import type { FeaturedRoute } from '@/app/route-discovery/types/featured-route';

export default function FeaturedRoutes() {
  const router        = useRouter();
  const { t }         = useTranslation();
  const { width }     = useWindowDimensions();
  const { routes, slideY, opacity } = useFeaturedRoutes();

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  if (routes.length === 0) return null;

  const cols    = width >= 768 ? 2 : 1;
  const GAP     = Spacing.lg;
  const visible = routes.slice(0, cols * 2);
  const rows: FeaturedRoute[][] = [];
  for (let i = 0; i < visible.length; i += cols) rows.push(visible.slice(i, i + cols));

  // Dynamic padding: 10% off sides on desktop, normal padding on mobile
  const isMobile = width < 768;
  const horizontalPadding = isMobile ? Spacing.base : Math.max(Spacing.base, width * 0.1);

  const handleOpenModal = (routeId: string) => setSelectedRouteId(routeId);
  const handleCloseModal = () => setSelectedRouteId(null);
  const handleBook = (routeId: string) =>
    router.push({ pathname: '/booking', params: { routeId } } as any);
  const handleSeeAll = () => router.push('/(tabs)/routes/results' as any);

  return (
    <Animated.View style={[s.section, { paddingHorizontal: horizontalPadding, transform: [{ translateY: slideY }], opacity }]}>
      <Text style={s.sectionLabel}>{t('home.featuredRoutes')}</Text>

      <View style={{ gap: GAP }}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={[s.row, { gap: GAP }]}>
            {row.map((route) => (
              <View key={route.id} style={{ flex: 1 }}>
                <FeaturedRouteCard route={route} onBook={handleOpenModal} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.seeAllBtn} onPress={handleSeeAll} activeOpacity={0.7}>
        <Text style={s.seeAllBtnText}>{t('home.showAllRoutes')}</Text>
      </TouchableOpacity>

      {selectedRouteId && (
        <RouteDetailsModal
          routeId={selectedRouteId}
          visible
          onClose={handleCloseModal}
          onBook={handleBook}
        />
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  section: { gap: Spacing.md },
  row: { flexDirection: 'row' },
  sectionLabel: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    letterSpacing: 0,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
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
