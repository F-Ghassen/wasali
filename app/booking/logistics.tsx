import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
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

const CALLING_CODES = [
  { code: '+216', label: '🇹🇳 Tunisia (+216)' },
  { code: '+33',  label: '🇫🇷 France (+33)' },
  { code: '+49',  label: '🇩🇪 Germany (+49)' },
  { code: '+39',  label: '🇮🇹 Italy (+39)' },
  { code: '+34',  label: '🇪🇸 Spain (+34)' },
  { code: '+32',  label: '🇧🇪 Belgium (+32)' },
  { code: '+41',  label: '🇨🇭 Switzerland (+41)' },
  { code: '+44',  label: '🇬🇧 UK (+44)' },
];

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
  const [ccModalVisible, setCcModalVisible] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<LogisticsData>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: {
      pickupType: (draft.pickupType as PickupType) || 'sender_dropoff',
      pickupAddress: draft.pickupAddress || '',
      dropoffType: (draft.dropoffType as DropoffType) || 'home_delivery',
      dropoffAddress: draft.dropoffAddress || '',
      recipientName: draft.recipientName || '',
      recipientPhoneCC: draft.recipientPhoneCC || '+216',
      recipientPhone: draft.recipientPhone || '',
      recipientPhoneIsWhatsapp: draft.recipientPhoneIsWhatsapp ?? false,
      driverNotes: draft.driverNotes || '',
    },
  });

  const pickupType = watch('pickupType');
  const dropoffType = watch('dropoffType');
  const selectedCC = watch('recipientPhoneCC');
  const isWhatsapp = watch('recipientPhoneIsWhatsapp');

  const onNext = (data: LogisticsData) => {
    setLogistics({
      pickupType: data.pickupType,
      pickupAddress: data.pickupAddress ?? '',
      dropoffType: data.dropoffType,
      dropoffAddress: data.dropoffAddress ?? '',
      recipientName: data.recipientName,
      recipientPhoneCC: data.recipientPhoneCC,
      recipientPhone: data.recipientPhone,
      recipientPhoneIsWhatsapp: data.recipientPhoneIsWhatsapp,
      driverNotes: data.driverNotes ?? '',
    });
    setStep(3);
    router.push('/booking/review-pay');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stepHeader}>
        <StepIndicator currentStep={2} totalSteps={3} labels={['Package', 'Logistics', 'Payment']} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Logistics</Text>

          {/* Pickup */}
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
                  error={errors.pickupAddress?.message}
                />
              )}
            />
          )}

          {/* Delivery */}
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
                  error={errors.dropoffAddress?.message}
                />
              )}
            />
          )}

          {/* Recipient */}
          <Text style={styles.sectionLabel}>Recipient</Text>
          <Controller
            control={control}
            name="recipientName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Recipient's full name"
                placeholder="e.g. Ahmed Ben Ali"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.recipientName?.message}
              />
            )}
          />

          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={styles.phoneRow}>
            <Controller
              control={control}
              name="recipientPhoneCC"
              render={() => (
                <TouchableOpacity style={styles.ccButton} onPress={() => setCcModalVisible(true)}>
                  <Text style={styles.ccText}>{selectedCC}</Text>
                  <Text style={styles.ccChevron}>▾</Text>
                </TouchableOpacity>
              )}
            />
            <Controller
              control={control}
              name="recipientPhone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.phoneInput, errors.recipientPhone && styles.inputError]}
                  placeholder="20 123 456"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.text.tertiary}
                />
              )}
            />
          </View>
          {errors.recipientPhone && <Text style={styles.error}>{errors.recipientPhone.message}</Text>}

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setValue('recipientPhoneIsWhatsapp', !isWhatsapp)}
          >
            <View style={[styles.checkbox, isWhatsapp && styles.checkboxChecked]}>
              {isWhatsapp && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>This number is on WhatsApp</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Notes for driver — optional</Text>
          <Controller
            control={control}
            name="driverNotes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.textarea}
                placeholder="e.g. Recipient is available after 5pm"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.text.tertiary}
              />
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button label="Next: Review & Pay" onPress={handleSubmit(onNext)} size="lg" />
      </View>

      {/* Calling code picker modal */}
      <Modal
        visible={ccModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCcModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCcModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select country code</Text>
            {CALLING_CODES.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.modalOption, selectedCC === item.code && styles.modalOptionSelected]}
                onPress={() => {
                  setValue('recipientPhoneCC', item.code);
                  setCcModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
                {selectedCC === item.code && <Text style={styles.modalCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  stepHeader: { paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  content: { padding: Spacing.base, paddingBottom: Spacing.xl },
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
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
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
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  ccButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    height: 48,
  },
  ccText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  ccChevron: { fontSize: 11, color: Colors.text.secondary },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  inputError: { borderColor: Colors.error },
  error: { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.sm },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkboxTick: { fontSize: 12, color: Colors.white, fontWeight: '700' },
  checkboxLabel: { fontSize: FontSize.base, color: Colors.text.primary },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  footer: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.light },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalOptionSelected: { backgroundColor: Colors.primaryLight },
  modalOptionText: { fontSize: FontSize.base, color: Colors.text.primary },
  modalCheck: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
