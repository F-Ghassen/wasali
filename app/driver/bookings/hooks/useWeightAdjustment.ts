import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDriverBookingStore } from '@/stores/driverBookingStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * Pickup weight-confirmation flow: shown when the driver taps "Mark as In
 * Transit" or completes a successful QR scan. If the weight is unchanged,
 * proceeds straight to markInTransit. If changed, calls adjustPackageWeight
 * first (recomputes price/payout + route capacity — see
 * stores/driverBookingStore.ts) and surfaces any capacity/validation error
 * in the modal before the transition proceeds.
 */
export function useWeightAdjustment(bookingId: string, bookedWeightKg: number) {
  const { t } = useTranslation();
  const { adjustPackageWeight, markInTransit } = useDriverBookingStore();
  const { showToast } = useUIStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState(String(bookedWeightKg));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setWeightInput(String(bookedWeightKg));
    setError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalVisible(false);
  };

  const confirmAndProceed = async () => {
    setError(null);
    const newWeight = parseFloat(weightInput);
    if (!(newWeight > 0)) {
      setError(t('bookingDetail.weightConfirm.invalid'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (newWeight !== bookedWeightKg) {
        await adjustPackageWeight(bookingId, newWeight);
      }
      await markInTransit(bookingId);
      setModalVisible(false);
      showToast(t('bookingDetail.toast.inTransit'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bookingDetail.alerts.weightAdjustErrorCapacity'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    modalVisible,
    weightInput,
    setWeightInput,
    isSubmitting,
    error,
    openModal,
    closeModal,
    confirmAndProceed,
  };
}
