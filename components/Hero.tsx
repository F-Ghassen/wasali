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
import { ArrowRight, Search } from 'lucide-react-native';
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
            {t('home.hero.headline')}
          </Text>
          <Text style={styles.subheadline}>
            {t('home.hero.subheadline')}
          </Text>
          <View style={styles.spacer} />
          <TouchableOpacity
            style={styles.driverCTA}
            onPress={handleDriverCTA}
            activeOpacity={0.65}
          >
            <Text style={styles.driverCTAText}>
              {t('home.hero.driverCTA')}
            </Text>
            <ArrowRight size={16} color={Colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.desktopRight}>
          <View style={styles.formTitleRow}>
            <Search size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.formTitle}>
              {t('home.hero.findRoutes')}
            </Text>
          </View>
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
          {t('home.hero.headline')}
        </Text>
        <Text style={styles.subheadline}>
          {t('home.hero.subheadline')}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.mobileSearch}>
        <View style={styles.formTitleRow}>
          <Search size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.formTitleMobile}>
            {t('home.hero.findRoutes')}
          </Text>
        </View>
        <SearchForm />
      </View>

      <TouchableOpacity
        style={styles.driverCTAMobile}
        onPress={handleDriverCTA}
        activeOpacity={0.65}
      >
        <Text style={styles.driverCTATextMobile}>
          {t('home.hero.driverCTA')}
        </Text>
        <ArrowRight size={14} color={Colors.primary} strokeWidth={2.5} />
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
    alignItems: 'stretch',
  },
  desktopLeft: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  desktopRight: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  // ── Mobile Layout ───────────────────────────────────────────────────────
  mobileContainer: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
    gap: Spacing['2xl'],
  },
  mobileCopy: {
    gap: Spacing.base,
  },
  mobileSearch: {
    gap: Spacing.md,
  },

  // ── Visual Divider ─────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.sm,
  },

  // ── Spacer ────────────────────────────────────────────────────────────
  spacer: {
    height: Spacing.md,
  },

  // ── Headlines & Copy ───────────────────────────────────────────────────
  headline: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 36,
  },
  subheadline: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.secondary,
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // ── Form Title ─────────────────────────────────────────────────────────
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  formTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  formTitleMobile: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },

  // ── Driver CTA (Desktop) ──────────────────────────────────────────────────
  driverCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
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
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
    marginTop: Spacing.sm,
  },
  driverCTATextMobile: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
