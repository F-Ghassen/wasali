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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { useBookingStore } from '@/stores/bookingStore';
import { logisticsSchema, type LogisticsData } from '@/utils/validators';

type PickupType = 'driver_pickup' | 'sender_dropoff';
type DropoffType = 'home_delivery' | 'recipient_pickup';

function OptionButton({
  label,
  sublabel,
  icon,
  selected,
  onPress,
}: {
  label: string;
  sublabel: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={styles.optionIcon}>{icon}</Text>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
        <Text style={styles.optionSublabel}>{sublabel}</Text>
      </View>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function LogisticsScreen() {
  const router = useRouter();
  const { draft, setLogistics, setStep } = useBookingStore();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<LogisticsData>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: {
      pickupType: (draft.pickupType as PickupType) || 'sender_dropoff',
      pickupAddress: draft.pickupAddress || '',
      dropoffType: (draft.dropoffType as DropoffType) || 'home_delivery',
      dropoffAddress: draft.dropoffAddress || '',
    },
  });

  const pickupType = watch('pickupType');
  const dropoffType = watch('dropoffType');

  const onNext = (data: LogisticsData) => {
    setLogistics({
      pickupType: data.pickupType,
      pickupAddress: data.pickupAddress ?? '',
      dropoffType: data.dropoffType,
      dropoffAddress: data.dropoffAddress ?? '',
    });
    setStep(3);
    router.push('/booking/review-pay');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stepHeader}>
        <StepIndicator currentStep={2} totalSteps={3} labels={['Package', 'Logistics', 'Payment']} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Logistics</Text>

        <Text style={styles.sectionLabel}>Pickup (in Europe)</Text>
        <OptionButton
          label="Driver picks up"
          sublabel="Driver comes to your address"
          icon="🏠"
          selected={pickupType === 'driver_pickup'}
          onPress={() => setValue('pickupType', 'driver_pickup')}
        />
        <OptionButton
          label="I drop off"
          sublabel="You bring package to driver's location"
          icon="📦"
          selected={pickupType === 'sender_dropoff'}
          onPress={() => setValue('pickupType', 'sender_dropoff')}
        />

        {pickupType === 'driver_pickup' && (
          <Controller
            control={control}
            name="pickupAddress"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Your pickup address"
                placeholder="123 Rue de la Paix, Paris"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
              />
            )}
          />
        )}

        <Text style={styles.sectionLabel}>Delivery (in Tunisia)</Text>
        <OptionButton
          label="Home delivery"
          sublabel="Driver delivers to recipient's address"
          icon="🏡"
          selected={dropoffType === 'home_delivery'}
          onPress={() => setValue('dropoffType', 'home_delivery')}
        />
        <OptionButton
          label="Recipient picks up"
          sublabel="Recipient collects from driver"
          icon="👋"
          selected={dropoffType === 'recipient_pickup'}
          onPress={() => setValue('dropoffType', 'recipient_pickup')}
        />

        {dropoffType === 'home_delivery' && (
          <Controller
            control={control}
            name="dropoffAddress"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Delivery address in Tunisia"
                placeholder="12 Rue Ibn Khaldoun, Tunis"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
              />
            )}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Next: Review & Pay" onPress={handleSubmit(onNext)} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  stepHeader: { paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  content: { padding: Spacing.base },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    backgroundColor: Colors.white,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionIcon: { fontSize: 24 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  optionLabelSelected: { color: Colors.primary },
  optionSublabel: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  footer: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.light },
});
