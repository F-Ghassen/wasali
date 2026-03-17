import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  onStepPress: (index: number) => void;
}

export function StepProgress({ steps, currentStep, completedSteps, onStepPress }: StepProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((label, i) => {
          const isCompleted = completedSteps.includes(i);
          const isCurrent = i === currentStep;
          const isClickable = isCompleted;

          return (
            <React.Fragment key={i}>
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => isClickable && onStepPress(i)}
                disabled={!isClickable}
                activeOpacity={isClickable ? 0.7 : 1}
              >
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && !isCompleted && styles.circleCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.circleNumber,
                        isCurrent && styles.circleNumberCurrent,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    (isCompleted || isCurrent) && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>

              {i < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.counter}>
        Step {currentStep + 1} of {steps.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  circleCurrent: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  circleNumber: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  circleNumberCurrent: {
    color: Colors.primary,
  },
  checkmark: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  label: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border.light,
    marginTop: 13,
    marginHorizontal: 2,
  },
  connectorCompleted: {
    backgroundColor: Colors.primary,
  },
  counter: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
