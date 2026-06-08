import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RouteAlertSubscriptionProps {
  onOpenAlertSheet?: () => void;
}

export default function RouteAlertSubscription({ onOpenAlertSheet }: RouteAlertSubscriptionProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubscribe = () => {
    if (onOpenAlertSheet) {
      onOpenAlertSheet();
    } else {
      // Fallback: navigate to routes page where alert sheet is available
      router.push('/(tabs)/routes/results' as any);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.iconBg}>
          <Bell size={24} color={Colors.primary} strokeWidth={2} />
        </View>
        <View style={s.headerContent}>
          <Text style={s.title}>{t('home.routeAlerts.title')}</Text>
          <Text style={s.subtitle}>{t('home.routeAlerts.subtitle')}</Text>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity style={s.ctaBtn} onPress={handleSubscribe} activeOpacity={0.85}>
        <Text style={s.ctaBtnText}>{t('home.routeAlerts.cta')}</Text>
        <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.base,
  },
});
