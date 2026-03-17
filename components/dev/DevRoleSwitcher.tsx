import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const DRIVER_COLOR = '#7C3AED';
const SENDER_COLOR = Colors.primary;

export function DevRoleSwitcher() {
  const router = useRouter();
  const { profile, session, updateProfile } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!session) return null;

  const currentRole = profile?.role ?? '…';
  const isDriver = currentRole === 'driver';
  const roleColor = isDriver ? DRIVER_COLOR : SENDER_COLOR;
  const targetRole: 'sender' | 'driver' = isDriver ? 'sender' : 'driver';
  const targetLabel = isDriver ? 'Switch to Sender' : 'Switch to Driver';
  const targetPath = isDriver ? '/(tabs)' : ('/(driver-tabs)' as any);

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      await updateProfile({ role: targetRole });
      setExpanded(false);
      router.replace(targetPath);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.panelEmail} numberOfLines={1}>
            {session.user.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '18' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {isDriver ? '🚛 Driver' : '📦 Sender'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.switchBtn, switching && styles.switchBtnDisabled]}
            onPress={handleSwitch}
            disabled={switching}
          >
            <Text style={styles.switchBtnText}>
              {switching ? 'Switching…' : targetLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.devLink}
            onPress={() => { setExpanded(false); router.push('/dev' as any); }}
          >
            <Text style={styles.devLinkText}>Open Dev Screen →</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: roleColor }]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={styles.pillText}>{expanded ? '✕' : 'DEV'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.lg,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  pill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  pillText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  panel: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
  },
  panelEmail: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  roleBadge: {
    borderRadius: BorderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  switchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  switchBtnDisabled: { opacity: 0.5 },
  switchBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  devLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  devLinkText: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
});
