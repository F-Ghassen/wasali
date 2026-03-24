import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { StepCardProps } from '../types';

export function StepCard({
  stepNum,
  title,
  isActive,
  isCompleted,
  isLocked,
  summary,
  onEdit,
  children,
}: StepCardProps) {
  return (
    <View style={[styles.card, isLocked && styles.cardLocked]}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            isCompleted && styles.badgeDone,
            isActive && styles.badgeActive,
          ]}
        >
          {isCompleted ? (
            <Check size={11} color={Colors.white} strokeWidth={3} />
          ) : isLocked ? (
            <Lock size={10} color={Colors.text.tertiary} />
          ) : (
            <Text style={[styles.badgeNum, isActive && styles.badgeNumActive]}>
              {stepNum}
            </Text>
          )}
        </View>
        <Text style={[styles.title, isLocked && styles.titleLocked]}>{title}</Text>
        {isCompleted && !isActive && onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {isCompleted && !isActive && summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
      {isActive ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLocked: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: Colors.success },
  badgeActive: { backgroundColor: Colors.primary },
  badgeNum: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  badgeNumActive: { color: Colors.white },
  title: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  titleLocked: { color: Colors.text.tertiary },
  editBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  editText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    marginLeft: 32,
  },
  body: { marginTop: Spacing.base },
});
