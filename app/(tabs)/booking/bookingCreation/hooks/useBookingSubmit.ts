import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '@/stores/bookingStore';
import { updateProfileNamePhone } from '../services/profileService';

interface UseBookingSubmitParams {
  profile: any;
  routeData: any;
  fs: any;
  weightNum: number;
  totalPrice: number;
  stepValidity: Record<number, boolean>;
  buildSubmitPayload: (profileId: string, routeData: any, totalPrice: number) => any;
  upsertRecipient: (data: any) => Promise<void>;
  clearDraft: () => void;
  setCurrentStep: (step: number) => void;
}

export function useBookingSubmit({
  profile,
  routeData,
  fs,
  weightNum,
  totalPrice,
  stepValidity,
  buildSubmitPayload,
  upsertRecipient,
  clearDraft,
  setCurrentStep,
}: UseBookingSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bookingStore = useBookingStore();
  const router = useRouter();

  async function handleSubmit() {
    if (!profile || !routeData) return;

    const firstInvalid = ([0, 1, 2, 3, 4] as const).find(
      (s) => !stepValidity[s],
    );
    if (firstInvalid !== undefined) {
      setCurrentStep(firstInvalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildSubmitPayload(profile.id, routeData, totalPrice);
      const bookingId = await bookingStore.submitBooking(payload as any);

      if (fs.saveRecipient && fs.recipientName && fs.recipientPhone) {
        await upsertRecipient({
          user_id: profile.id,
          name: fs.recipientName,
          phone: `${fs.recipientCC}${fs.recipientPhone}`,
          whatsapp_enabled: fs.recipientWhatsapp,
          address_street: fs.recipientAddressStreet || null,
          address_city: fs.recipientAddressCity || null,
          address_postal_code: fs.recipientAddressPostalCode || null,
        });
      }

      if (fs.senderMode === 'own' && fs.updateMyProfile) {
        await updateProfileNamePhone(
          profile.id,
          fs.senderName,
          `${fs.senderCC}${fs.senderPhone}`,
        );
      }

      bookingStore.setLastBooking({
        id: bookingId,
        totalPrice,
        collectionStopCity: fs.collectionStopCity,
        dropoffStopCity: fs.dropoffStopCity,
        collectionStopDate: fs.collectionStopDate,
        dropoffStopDate: fs.dropoffStopDate,
        collectionServiceType: fs.collectionServiceType,
        deliveryServiceType: fs.deliveryServiceType,
        senderName: fs.senderMode === 'own' ? fs.senderName : fs.behalfName,
        recipientName: fs.recipientName,
        recipientPhone: `${fs.recipientCC}${fs.recipientPhone}`,
        packageWeightKg: weightNum,
        packageTypes: fs.packageTypes,
        paymentType: fs.paymentType,
        driverName: routeData.driver?.full_name ?? null,
        driverPhone: routeData.driver?.phone ?? null,
      });

      clearDraft();
      router.replace({
        pathname: '/booking/bookingDetail/[id]',
        params: { id: bookingId },
      } as any);
    } catch (err) {
      Alert.alert(
        'Booking failed',
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, handleSubmit };
}
