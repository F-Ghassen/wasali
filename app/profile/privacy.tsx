import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useConsentSettings } from '@/hooks/useConsentSettings';

export default function PrivacyScreen() {
  const router = useRouter();
  const { analyticsEnabled, marketingEnabled, setAnalytics, setMarketing } = useConsentSettings();
  const [isSaving, setIsSaving] = useState(false);

  const save = async (write: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await write();
    } catch {
      Alert.alert('Error', 'Failed to update your privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ConsentRow
            title="Usage analytics"
            description="Anonymous data about how the app is used, so we can make it better."
            value={analyticsEnabled}
            disabled={isSaving}
            onChange={(granted) => save(() => setAnalytics(granted))}
          />
          <View style={styles.separator} />
          <ConsentRow
            title="Marketing emails"
            description="Occasional news about new routes and offers."
            value={marketingEnabled}
            disabled={isSaving}
            onChange={(granted) => save(() => setMarketing(granted))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsentRow({
  title,
  description,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (granted: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: Colors.border.medium, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  rowDescription: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 18 },
  separator: { height: 1, backgroundColor: Colors.border.light, marginLeft: Spacing.base },
});
