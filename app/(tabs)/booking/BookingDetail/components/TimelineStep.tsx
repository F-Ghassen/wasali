import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { stepSubtitle } from '../utils/stepSubtitle';
import type { BookingStatus } from '@/constants/bookingStatus';
import type { BookingWithDriver, StepState } from '../types/index';

interface TimelineStepProps {
  step: { key: BookingStatus; label: string };
  state: StepState;
  isLast: boolean;
  booking: BookingWithDriver;
}

export function TimelineStep({ step, state, isLast, booking }: TimelineStepProps) {
  const isDone    = state === 'done';
  const isCurrent = state === 'current';

  return (
    <View style={styles.row}>
      <View style={styles.dotCol}>
        <View style={[styles.dot, isDone && styles.dotDone, isCurrent && styles.dotCurrent, !isDone && !isCurrent && styles.dotPending]}>
          {isDone ? (
            <Check size={12} color={Colors.white} strokeWidth={3} />
          ) : isCurrent ? (
            <View style={styles.dotCurrentInner} />
          ) : null}
        </View>
        {!isLast && <View style={[styles.line, isDone && styles.lineDone]} />}
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, isDone && styles.labelDone, isCurrent && styles.labelCurrent, !isDone && !isCurrent && styles.labelPending]}>
          {step.label}
        </Text>
        <Text style={[styles.subtitle, !isDone && !isCurrent && styles.subtitlePending]}>
          {stepSubtitle(step.key, state, booking)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:                { flexDirection: 'row', marginBottom: Spacing.lg },
  dotCol:             { alignItems: 'center', marginRight: Spacing.md },
  dot:                { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border.light, alignItems: 'center', justifyContent: 'center' },
  dotDone:            { backgroundColor: Colors.success, borderColor: Colors.success },
  dotCurrent:         { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotPending:         { backgroundColor: Colors.background.secondary },
  dotCurrentInner:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.white },
  line:               { width: 2, flex: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  lineDone:           { backgroundColor: Colors.success },
  body:               { flex: 1, paddingTop: Spacing.xs },
  label:              { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.xs },
  labelDone:          { color: Colors.text.secondary },
  labelCurrent:       { color: Colors.primary, fontWeight: '700' },
  labelPending:       { color: Colors.text.tertiary },
  subtitle:           { fontSize: FontSize.sm, color: Colors.text.secondary },
  subtitlePending:    { color: Colors.text.tertiary },
});
