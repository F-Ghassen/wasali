import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';

interface PendingAction {
  title: string;
  message: string;
  confirmLabel: string;
  successMessage: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

/**
 * Confirm/reject/mark-paid handlers for the driver booking detail screen.
 *
 * Bug fix: this used to build the confirmation dialog with `Alert.alert(...)`,
 * which is a documented no-op on web (react-native-web ships a literal
 * `static alert() {}`) — on a web build, tapping Confirm/Reject showed no
 * dialog and the action never ran at all. Replaced with state driving a
 * `ConfirmActionModal` (real `Modal`, works cross-platform), rendered by the
 * screen. Also fixes the previous success-toast text, which was built via
 * `label.toLowerCase() + 'd'` — grammatically broken for every action
 * ("Booking confirmd", "Booking rejectd", "Booking mark in transitd").
 *
 * Mark-in-transit is handled separately by useWeightAdjustment (it needs a
 * weight-confirmation step first, not a plain yes/no confirm).
 */
export function useDriverBookingActions(bookingId: string) {
  const { t } = useTranslation();
  const { confirmBooking, rejectBooking, markDelivered, markPaid, isLoading } = useDriverBookingStore();
  const { showToast } = useUIStore();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runPending = async () => {
    if (!pending) return;
    setIsSubmitting(true);
    try {
      await pending.run();
      showToast(pending.successMessage, 'success');
      setPending(null);
    } catch {
      showToast(t('bookingDetail.toast.failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePending = () => {
    if (isSubmitting) return;
    setPending(null);
  };

  const confirm = () => setPending({
    title: t('bookingDetail.alerts.confirmTitle'),
    message: t('bookingDetail.alerts.confirmMsg'),
    confirmLabel: t('bookingDetail.actions.confirm'),
    successMessage: t('bookingDetail.toast.confirmed'),
    run: () => confirmBooking(bookingId),
  });

  const reject = () => setPending({
    title: t('bookingDetail.alerts.rejectTitle'),
    message: t('bookingDetail.alerts.rejectMsg'),
    confirmLabel: t('bookingDetail.actions.reject'),
    successMessage: t('bookingDetail.toast.rejected'),
    destructive: true,
    run: () => rejectBooking(bookingId),
  });

  const deliver = () => setPending({
    title: t('bookingDetail.alerts.deliveredTitle'),
    message: t('bookingDetail.alerts.deliveredMsg'),
    confirmLabel: t('bookingDetail.actions.markDelivered'),
    successMessage: t('bookingDetail.toast.delivered'),
    run: () => markDelivered(bookingId),
  });

  const markAsPaid = () => setPending({
    title: t('bookingDetail.actions.markAsPaid'),
    message: t('bookingDetail.alerts.markPaidMsg'),
    confirmLabel: t('bookingDetail.actions.markAsPaid'),
    successMessage: t('bookingDetail.toast.markedPaid'),
    run: () => markPaid(bookingId),
  });

  return {
    confirm,
    reject,
    deliver,
    markAsPaid,
    isLoading,
    confirmModal: pending
      ? {
          visible: true,
          title: pending.title,
          message: pending.message,
          confirmLabel: pending.confirmLabel,
          destructive: pending.destructive,
          isLoading: isSubmitting,
          onConfirm: runPending,
          onClose: closePending,
        }
      : { visible: false, title: '', message: '', confirmLabel: '', onConfirm: () => {}, onClose: () => {} },
  };
}
