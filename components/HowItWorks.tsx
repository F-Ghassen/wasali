import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, Package, CheckCircle, Star, ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

type Step = {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
};

function getSteps(t: any): Step[] {
  const stepsData = t('home.howItWorks.steps', { returnObjects: true });
  const icons = [
    <Search size={20} color={Colors.primary} strokeWidth={2.5} />,
    <Package size={20} color={Colors.primary} strokeWidth={2.5} />,
    <CheckCircle size={20} color={Colors.primary} strokeWidth={2.5} />,
    <Star size={20} color={Colors.primary} strokeWidth={2.5} />,
  ];

  return stepsData.map((step: any, i: number) => ({
    number: i + 1,
    title: step.title,
    description: step.description,
    icon: icons[i],
  }));
}

function StepCard({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <View style={styles.stepCardWrapper}>
      <View style={styles.stepCard}>
        {/* Left: Number and Icon */}
        <View style={styles.stepCardLeft}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{step.number}</Text>
          </View>
          <View style={styles.iconContainer}>
            {step.icon}
          </View>
        </View>

        {/* Right: Title and Description */}
        <View style={styles.stepCardRight}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>
      </View>

      {/* Connector arrow (desktop only) */}
      {!isLast && (
        <View style={styles.arrowConnector}>
          <ArrowRight size={20} color={Colors.border.light} strokeWidth={2} />
        </View>
      )}
    </View>
  );
}

function MobileStepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  return (
    <View style={styles.mobileStepWrapper}>
      {/* Step Indicator Line */}
      <View style={styles.mobileIndicatorLine}>
        <View style={styles.mobileIndicatorDot} />
        {index < total - 1 && <View style={styles.mobileConnectorLine} />}
      </View>

      {/* Content */}
      <View style={styles.mobileStepCard}>
        {/* Icon Container */}
        <View style={styles.mobileIconContainer}>
          {step.icon}
        </View>

        {/* Title and Description */}
        <View style={styles.mobileContent}>
          <Text style={styles.mobileStepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HowItWorks() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const { t } = useTranslation();
  const steps = getSteps(t);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.howItWorks.title')}</Text>
        <Text style={styles.subtitle}>
          {t('home.howItWorks.subtitle')}
        </Text>
      </View>

      {/* Steps */}
      {isWide ? (
        // Desktop: Row layout with arrow connectors
        <View style={styles.stepsRowDesktop}>
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} isLast={i === steps.length - 1} />
          ))}
        </View>
      ) : (
        // Mobile: Timeline layout
        <View style={styles.stepsColumnMobile}>
          {steps.map((step, i) => (
            <MobileStepCard key={step.number} step={step} index={i} total={steps.length} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 480,
    fontWeight: '500',
  },

  // ── Desktop Row Layout ───────────────────────────────────────────────────
  stepsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing['2xl'],
    marginTop: Spacing.lg,
  },
  stepCardWrapper: {
    flex: 1,
    alignItems: 'stretch',
  },
  arrowConnector: {
    alignSelf: 'center',
    marginHorizontal: Spacing.sm,
  },

  // ── Mobile Timeline Layout ──────────────────────────────────────────────
  stepsColumnMobile: {
    gap: 0,
    marginTop: Spacing.xl,
  },
  mobileStepWrapper: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mobileIndicatorLine: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  mobileIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  mobileConnectorLine: {
    width: 2,
    height: 80,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.xs,
  },
  mobileContent: {
    flex: 1,
    gap: Spacing.xs,
  },

  // ── Desktop Step Card ───────────────────────────────────────────────────
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  stepCardLeft: {
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  stepCardRight: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },

  // ── Mobile Step Card ────────────────────────────────────────────────────
  mobileStepCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
  },

  // ── Number Badge (Desktop) ──────────────────────────────────────────────
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },

  // ── Icon Container ──────────────────────────────────────────────────────
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },

  // ── Mobile Icon Container ───────────────────────────────────────────────
  mobileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: Spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },

  // ── Step Title ───────────────────────────────────────────────────────────
  stepTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'left',
    lineHeight: 22,
  },

  // ── Mobile Step Title ────────────────────────────────────────────────────
  mobileStepTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  // ── Step Description ────────────────────────────────────────────────────
  stepDescription: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'left',
    lineHeight: 20,
    fontWeight: '400',
  },
});
