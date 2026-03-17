import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { EU_ORIGIN_CITIES } from '@/constants/cities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useUIStore } from '@/stores/uiStore';
import { createRouteSchema, type CreateRouteData } from '@/utils/validators';

interface StopDraft {
  city: string;
  country: string;
  arrival_date: string;
  is_pickup_available: boolean;
  is_dropoff_available: boolean;
}

export default function NewRouteScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { createRoute, isLoading } = useDriverRouteStore();
  const { showToast } = useUIStore();
  const [stops, setStops] = useState<StopDraft[]>([]);

  const { control, handleSubmit, formState: { errors } } = useForm<CreateRouteData>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: {
      available_weight_kg: 20,
      price_per_kg_eur: 5,
    },
  });

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { city: '', country: '', arrival_date: '', is_pickup_available: true, is_dropoff_available: true },
    ]);
  };

  const removeStop = (idx: number) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: CreateRouteData) => {
    if (!profile) return;
    try {
      const stopsWithOrder = stops
        .filter((s) => s.city && s.country)
        .map((s, i) => ({ ...s, stop_order: i + 1 }));

      await createRoute(profile.id, { ...data, stops: stopsWithOrder });
      showToast('Route created successfully!', 'success');
      router.back();
    } catch {
      showToast('Failed to create route. Please try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Route</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Origin */}
          <Text style={styles.sectionTitle}>Origin</Text>
          <Controller
            control={control}
            name="origin_city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Departure city"
                placeholder="e.g. Paris"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.origin_city?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="origin_country"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Departure country"
                placeholder="e.g. France"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.origin_country?.message}
              />
            )}
          />

          {/* Destination */}
          <Text style={styles.sectionTitle}>Destination</Text>
          <Controller
            control={control}
            name="destination_city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Arrival city"
                placeholder="e.g. Tunis"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.destination_city?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="destination_country"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Arrival country"
                placeholder="e.g. Tunisia"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.destination_country?.message}
              />
            )}
          />

          {/* Dates */}
          <Text style={styles.sectionTitle}>Dates</Text>
          <Controller
            control={control}
            name="departure_date"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Departure date"
                placeholder="YYYY-MM-DD"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.departure_date?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="estimated_arrival_date"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Estimated arrival date (optional)"
                placeholder="YYYY-MM-DD"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                error={errors.estimated_arrival_date?.message}
              />
            )}
          />

          {/* Capacity & Price */}
          <Text style={styles.sectionTitle}>Capacity & Pricing</Text>
          <Controller
            control={control}
            name="available_weight_kg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Available weight (kg)"
                placeholder="20"
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                onBlur={onBlur}
                value={value?.toString() ?? ''}
                error={errors.available_weight_kg?.message}
                keyboardType="decimal-pad"
              />
            )}
          />
          <Controller
            control={control}
            name="price_per_kg_eur"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Price per kg (€)"
                placeholder="5"
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                onBlur={onBlur}
                value={value?.toString() ?? ''}
                error={errors.price_per_kg_eur?.message}
                keyboardType="decimal-pad"
              />
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Notes (optional)"
                placeholder="Any info for senders..."
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                error={errors.notes?.message}
                multiline
                numberOfLines={3}
              />
            )}
          />

          {/* Stops */}
          <View style={styles.stopsHeader}>
            <Text style={styles.sectionTitle}>Intermediate Stops</Text>
            <TouchableOpacity onPress={addStop} style={styles.addStopBtn}>
              <Plus size={16} color={Colors.primary} />
              <Text style={styles.addStopText}>Add stop</Text>
            </TouchableOpacity>
          </View>

          {stops.map((stop, idx) => (
            <View key={idx} style={styles.stopCard}>
              <View style={styles.stopCardHeader}>
                <Text style={styles.stopLabel}>Stop {idx + 1}</Text>
                <TouchableOpacity onPress={() => removeStop(idx)}>
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
              <Input
                label="City"
                placeholder="e.g. Rome"
                value={stop.city}
                onChangeText={(t) => setStops((prev) => prev.map((s, i) => i === idx ? { ...s, city: t } : s))}
              />
              <Input
                label="Country"
                placeholder="e.g. Italy"
                value={stop.country}
                onChangeText={(t) => setStops((prev) => prev.map((s, i) => i === idx ? { ...s, country: t } : s))}
              />
            </View>
          ))}

          <Button
            label={isLoading ? 'Creating…' : 'Create Route'}
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  addStopText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  stopCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stopLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  submitBtn: { marginTop: Spacing.xl },
});
