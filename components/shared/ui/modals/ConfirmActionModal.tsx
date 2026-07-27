import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Cross-platform replacement for `Alert.alert(...)`-based confirmation
 * dialogs. `Alert.alert` is a documented no-op on web
 * (react-native-web's implementation is a literal `static alert() {}`), so
 * any flow gated behind it — e.g. the driver's Confirm/Reject booking
 * buttons — silently does nothing at all on a web build. Uses RN's `Modal`,
 * which react-native-web implements for real.
 */
export function ConfirmActionModal({
  visible, title, message, confirmLabel, destructive, isLoading, onConfirm, onClose,
}: ConfirmActionModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label={t('common.cancel')} onPress={onClose} variant="ghost" size="md" disabled={isLoading} fullWidth={false} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
              size="md"
              isLoading={isLoading}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  message: { fontSize: FontSize.sm, color: Colors.text.secondary },
  actions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
});
