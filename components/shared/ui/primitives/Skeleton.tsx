import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/spacing';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = BorderRadius.md, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.skeleton, { width: width as any, height, borderRadius, opacity }, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={20} width="60%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="40%" style={{ marginBottom: 12 }} />
      <Skeleton height={14} width="80%" />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: Colors.border.light },
  card: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: BorderRadius.lg,
    marginBottom: 12,
  },
});
