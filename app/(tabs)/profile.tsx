import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

function ProfileRow({
  icon,
  label,
  onPress,
  isDestructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, isDestructive && styles.destructive]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { showToast } = useUIStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      // navigation handled automatically by SIGNED_OUT event in _layout.tsx
    } catch {
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <ProfileRow icon="✏️" label="Edit Profile" onPress={() => router.push('/profile/edit')} />
            <View style={styles.separator} />
            <ProfileRow icon="📍" label="Saved Addresses" onPress={() => router.push('/profile/addresses')} />
            <View style={styles.separator} />
            <ProfileRow icon="🔔" label="Notifications" onPress={() => router.push('/profile/notifications')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <ProfileRow icon="❓" label="Help Center" onPress={() => {}} />
            <View style={styles.separator} />
            <ProfileRow icon="📜" label="Terms & Privacy" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <ProfileRow icon="🚪" label="Sign Out" onPress={handleSignOut} isDestructive />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.base, alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.base,
  },
  avatarText: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing['2xl'] },
  section: { width: '100%', marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  rowIcon: { fontSize: 20, width: 28 },
  rowLabel: { flex: 1, fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  destructive: { color: Colors.error },
  chevron: { fontSize: 18, color: Colors.text.tertiary },
  separator: { height: 1, backgroundColor: Colors.border.light, marginLeft: 60 },
});
