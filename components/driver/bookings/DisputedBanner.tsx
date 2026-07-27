import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

/** Bug fix: the driver detail screen's action-buttons block had no branch
 *  for the 'disputed' status — the driver saw an empty card with no
 *  explanation and no path forward. */
export function DisputedBanner() {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <AlertTriangle size={20} color={Colors.error} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('bookingDetail.disputed.title')}</Text>
        <Text style={styles.message}>{t('bookingDetail.disputed.message')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.error },
  message: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
});
