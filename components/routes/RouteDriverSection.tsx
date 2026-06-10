import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

interface RouteDriverSectionProps {
  driver: any;
  onContact?: () => void;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function RouteDriverSection({ driver, onContact }: RouteDriverSectionProps) {
  if (!driver) {
    return null;
  }

  const rating = driver.rating ?? 0;
  const trips = driver.completed_trips ?? 0;
  const isNew = rating === 0;
  const isVerified = driver.phone_verified;

  return (
    <View style={s.card}>
      <Text style={s.title}>Driver Information</Text>

      <View style={s.driverCard}>
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(driver.full_name)}</Text>
        </View>

        {/* Info */}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.driverName}>{driver.full_name || 'Driver'}</Text>
            {isVerified && <Text style={s.verifyBadge}>✓ Verified</Text>}
          </View>

          {isNew ? (
            <Text style={s.newLabel}>🆕 New driver</Text>
          ) : (
            <View style={s.stats}>
              <View style={s.statRow}>
                <Star size={12} color={Colors.secondary} fill={Colors.secondary} />
                <Text style={s.statText}>{rating.toFixed(1)}</Text>
              </View>
              <Text style={s.dot}>·</Text>
              <Text style={s.statText}>{trips} trip{trips !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Contact Button */}
        {onContact && (
          <TouchableOpacity style={s.contactBtn} onPress={onContact}>
            <MessageCircle size={16} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.md,
  },

  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },

  info: {
    flex: 1,
    gap: 4,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  driverName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  verifyBadge: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.secondary,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  statText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  dot: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },

  newLabel: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },

  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
