import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import SearchForm from '@/components/SearchForm';

interface HeroProps {
  onDriverCTAPress?: () => void;
}

export default function Hero({ onDriverCTAPress }: HeroProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const router = useRouter();
  const { t } = useTranslation();

  const handleDriverCTA = () => {
    onDriverCTAPress?.();
    router.push('/(auth)/sign-up-driver' as any);
  };

  if (isWide) {
    // Desktop: Split layout (55% copy on left, 45% search on right)
    return (
      <View style={styles.desktopContainer}>
        <View style={styles.desktopLeft}>
          <Text style={styles.headline}>
            {t('hero.headline') || 'Send packages to Tunisia from Europe. Or receive from family abroad.'}
          </Text>
          <Text style={styles.subheadline}>
            {t('hero.subheadline') || 'Cheaper than couriers. Faster than mail. Trustworthy drivers.'}
          </Text>
          <TouchableOpacity
            style={styles.driverCTA}
            onPress={handleDriverCTA}
            activeOpacity={0.7}
          >
            <Text style={styles.driverCTAText}>
              {t('hero.driverCTA') || 'Are you a driver? Earn money'}
            </Text>
            <ArrowRight size={16} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.desktopRight}>
          <Text style={styles.formTitle}>
            {t('hero.findRoutes') || 'Find available routes'}
          </Text>
          <SearchForm />
        </View>
      </View>
    );
  }

  // Mobile: Stacked layout
  return (
    <View style={styles.mobileContainer}>
      <View style={styles.mobileCopy}>
        <Text style={styles.headline}>
          {t('hero.headline') || 'Send packages to Tunisia from Europe. Or receive from family abroad.'}
        </Text>
        <Text style={styles.subheadline}>
          {t('hero.subheadline') || 'Cheaper than couriers. Faster than mail. Trustworthy drivers.'}
        </Text>
      </View>

      <View style={styles.mobileSearch}>
        <Text style={styles.formTitle}>
          {t('hero.findRoutes') || 'Find available routes'}
        </Text>
        <SearchForm />
      </View>

      <TouchableOpacity
        style={styles.driverCTAMobile}
        onPress={handleDriverCTA}
        activeOpacity={0.7}
      >
        <Text style={styles.driverCTATextMobile}>
          {t('hero.driverCTA') || 'Are you a driver? Earn money'}
        </Text>
        <ArrowRight size={16} color={Colors.primary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Desktop Layout ───────────────────────────────────────────────────────
  desktopContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    gap: Spacing['3xl'],
    alignItems: 'flex-start',
  },
  desktopLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  desktopRight: {
    flex: 1,
  },

  // ── Mobile Layout ───────────────────────────────────────────────────────
  mobileContainer: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
    gap: Spacing['2xl'],
  },
  mobileCopy: {
    gap: Spacing.md,
  },
  mobileSearch: {
    gap: Spacing.md,
  },

  // ── Headlines & Copy ───────────────────────────────────────────────────
  headline: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 36,
    marginBottom: Spacing.md,
  },
  subheadline: {
    fontSize: FontSize.lg,
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 28,
    marginBottom: Spacing['2xl'],
  },

  // ── Form Title ───────────────────────────────────────────────────────────
  formTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // ── Driver CTA (Desktop) ──────────────────────────────────────────────────
  driverCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  driverCTAText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ── Driver CTA (Mobile) ───────────────────────────────────────────────────
  driverCTAMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  driverCTATextMobile: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
});
