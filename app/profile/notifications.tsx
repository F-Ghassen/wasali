import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          {[
            { label: 'Booking updates', sub: 'Status changes and confirmations' },
            { label: 'New offers', sub: 'When a driver responds to your request' },
            { label: 'Delivery alerts', sub: 'When your package is nearby' },
            { label: 'Promotions', sub: 'Special deals and offers' },
          ].map((item, index, arr) => (
            <View key={item.label}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowSub}>{item.sub}</Text>
                </View>
                <Switch
                  value={index < 3}
                  trackColor={{ false: Colors.border.medium, true: Colors.primary }}
                />
              </View>
              {index < arr.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  rowLabel: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text.primary, marginBottom: 2 },
  rowSub: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  separator: { height: 1, backgroundColor: Colors.border.light, marginHorizontal: Spacing.base },
});
