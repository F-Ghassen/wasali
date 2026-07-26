import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BorderRadius } from '@/constants/spacing';
import { getFlagSvg } from '@/lib/flagImages';

interface FlagIconProps {
  /** Country name, e.g. "Germany" — resolved to an ISO code internally */
  country: string;
  /** Style for the wrapping container — pass the same layout style used for an <Image> (e.g. absolute-fill cardImage) */
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a country flag from a locally bundled SVG (see lib/flagImages.ts).
 * Drop-in replacement for <Image source={{ uri: getFlagImageUrl(country) }} style={...} resizeMode="cover" />.
 * Vector-based, so it scales cleanly to any card size without the distortion/pixelation
 * raster PNGs show when stretched — and has no network dependency.
 *
 * Uses preserveAspectRatio="xMidYMid meet" (contain, not cover): flags are a handful of
 * horizontal/vertical bands, so cropping to fill a wide/short card (cover/"slice") can zoom
 * in far enough that only the middle band is visible — e.g. Germany's flag showing as solid
 * red. "meet" always shows the whole flag, centered, letterboxed by the card's own
 * background color if the card's aspect ratio doesn't match the flag's.
 */
export function FlagIcon({ country, style }: FlagIconProps) {
  const xml = getFlagSvg(country);

  if (!xml) {
    return <View style={[styles.fallback, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
  },
});
