import React from 'react';
import { Animated, Pressable, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { FlagIcon } from '@/components/shared/ui/primitives/FlagIcon';
import { useCountryCardAnimation } from './hooks/useCountryCardAnimation';

interface CountryCardProps {
  country: string;
  routeCount: number;
  /** Position in the grid/row — drives the staggered entrance animation */
  index: number;
  onPress: () => void;
  /** Size variant: desktop row card (wider, single line) vs mobile 2x2 grid card */
  variant: 'desktop' | 'mobile';
  style?: StyleProp<ViewStyle>;
}

/**
 * A single country card on the home page's "Shipping Routes by Country" section.
 * Renders the flag (FlagIcon), a gradient + sheen overlay, and route-count copy.
 * Animation (entrance stagger, sheen sweep, press scale, web hover lift) lives in
 * useCountryCardAnimation — this component only wires it to gesture handlers.
 * Uses Pressable (not TouchableOpacity) so onHoverIn/onHoverOut fire on web.
 */
export function CountryCard({ country, routeCount, index, onPress, variant, style }: CountryCardProps) {
  const { cardStyle, shadowOpacity, sheenTranslateX, onPressIn, onPressOut, onHoverIn, onHoverOut } =
    useCountryCardAnimation({ index });
  const isMobile = variant === 'mobile';

  return (
    <Animated.View
      style={[
        isMobile ? styles.countryCardMobile : styles.countryCard,
        { shadowOpacity },
        cardStyle,
        style,
      ]}
    >
      <Pressable
        style={styles.touchable}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
      >
        <FlagIcon country={country} style={styles.cardImage} />

        {/* Diagonal sheen sweep — plays once on mount, purely decorative */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sheen,
            {
              transform: [
                {
                  translateX: sheenTranslateX.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-60%', '160%'],
                  }),
                },
                { rotate: '20deg' },
              ],
            },
          ]}
        />

        <LinearGradient
          colors={['transparent', isMobile ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.75)']}
          style={styles.cardGradient}
        />

        <View style={styles.cardContent}>
          <Text style={styles.countryName}>{country}</Text>
          <View style={styles.routeMeta}>
            <Package size={isMobile ? 10 : 11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            <Text style={styles.routeCount}>
              {isMobile
                ? `${routeCount} active routes`
                : `${routeCount} active ${routeCount === 1 ? 'route' : 'routes'}`}
            </Text>
          </View>
        </View>

        {!isMobile && (
          <View style={styles.arrowChip}>
            <ArrowRight size={12} color={Colors.white} strokeWidth={2.5} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },

  countryCard: {
    flex: 1,
    // Cap width so a card never stretches far past the flag's own aspect ratio
    // (~5:3) at this height — with few countries, flex:1 alone would stretch a
    // single card across the full row width, forcing FlagIcon to letterbox.
    maxWidth: 280,
    height: 160,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background.secondary,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  countryCardMobile: {
    width: '48%',
    height: 150,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background.secondary,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  sheen: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: 0,
    width: '35%',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: 4,
  },
  countryName: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeCount: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
  arrowChip: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
