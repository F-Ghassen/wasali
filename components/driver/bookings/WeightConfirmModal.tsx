import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';

interface WeightConfirmModalProps {
  visible: boolean;
  bookedWeightKg: number;
  weightInput: string;
  onWeightInputChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Pickup weight confirm/adjust step — mirrors QrScannerModal's
 *  confirm-then-act pattern. Shown when the driver marks a booking as
 *  in transit (via button or successful QR scan). */
export function WeightConfirmModal({
  visible, bookedWeightKg, weightInput, onWeightInputChange, isSubmitting, error, onConfirm, onClose,
}: WeightConfirmModalProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  const isAdjusted = parseFloat(weightInput) !== bookedWeightKg;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('bookingDetail.weightConfirm.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSubmitting}>
              <X size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('bookingDetail.weightConfirm.subtitle')}</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={weightInput}
              onChangeText={onWeightInputChange}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          {isAdjusted && (
            <Text style={styles.adjustedNotice}>{t('bookingDetail.weightConfirm.adjustedNotice')}</Text>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            label={t('bookingDetail.weightConfirm.confirmBtn')}
            onPress={onConfirm}
            isLoading={isSubmitting}
            size="lg"
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  input: { flex: 1, fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary },
  unit: { fontSize: FontSize.base, color: Colors.text.tertiary, fontWeight: '600' },
  adjustedNotice: { fontSize: FontSize.xs, color: Colors.warning },
  errorText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
});
