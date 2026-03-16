import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <React.Fragment key={step}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  isActive && styles.activeCircle,
                  isCompleted && styles.completedCircle,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (isActive || isCompleted) && styles.activeStepNumber,
                  ]}
                >
                  {isCompleted ? '✓' : step}
                </Text>
              </View>
              {labels?.[i] && (
                <Text
                  style={[styles.label, isActive && styles.activeLabel]}
                  numberOfLines={1}
                >
                  {labels[i]}
                </Text>
              )}
            </View>
            {step < totalSteps && (
              <View style={[styles.line, isCompleted && styles.completedLine]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  stepWrapper: { alignItems: 'center', width: 60 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  activeCircle: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  completedCircle: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepNumber: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary },
  activeStepNumber: { color: Colors.primary },
  line: { flex: 1, height: 2, backgroundColor: Colors.border.light, marginBottom: 20 },
  completedLine: { backgroundColor: Colors.primary },
  label: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4, textAlign: 'center' },
  activeLabel: { color: Colors.primary, fontWeight: '600' },
});
