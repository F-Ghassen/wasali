import React, { useEffect } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useUIStore, type Toast as ToastData } from '@/stores/uiStore';

const TOAST_COLORS: Record<string, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.primary,
};

function ToastItem({ toast }: { toast: ToastData }) {
  const opacity = new Animated.Value(0);
  const { dismissToast } = useUIStore();

  useEffect(() => {
    Animated.spring(opacity, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <View style={[styles.indicator, { backgroundColor: TOAST_COLORS[toast.type] }]} />
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toastQueue } = useUIStore();
  const insets = useSafeAreaInsets();

  if (toastQueue.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + Spacing.base }]}>
      {toastQueue.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.text.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  indicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '500',
  },
});
