import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops, BookingWithRoute } from '@/types/models';

interface BookingDraft {
  // Step 1: Package details
  packageWeightKg: number;
  packageCategory: string;
  packagePhotos: string[];
  declaredValueEur: number | null;
  notes: string;

  // Step 2: Logistics
  pickupType: 'driver_pickup' | 'sender_dropoff';
  pickupAddress: string;
  dropoffType: 'home_delivery' | 'recipient_pickup';
  dropoffAddress: string;
}

interface BookingState {
  selectedRoute: RouteWithStops | null;
  step: 1 | 2 | 3;
  draft: BookingDraft;
  calculatedPriceEur: number;
  paymentIntentClientSecret: string | null;
  pendingBookingId: string | null;
  isLoading: boolean;
}

interface BookingActions {
  setRoute: (route: RouteWithStops) => void;
  setStep: (step: 1 | 2 | 3) => void;
  setPackageDetails: (details: Partial<BookingDraft>) => void;
  setLogistics: (logistics: Partial<BookingDraft>) => void;
  computePrice: () => void;
  createPaymentIntent: (senderId: string) => Promise<string>;
  confirmBooking: (paymentIntentId: string) => Promise<string>;
  reset: () => void;
}

const defaultDraft: BookingDraft = {
  packageWeightKg: 1,
  packageCategory: '',
  packagePhotos: [],
  declaredValueEur: null,
  notes: '',
  pickupType: 'sender_dropoff',
  pickupAddress: '',
  dropoffType: 'home_delivery',
  dropoffAddress: '',
};

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
  selectedRoute: null,
  step: 1,
  draft: defaultDraft,
  calculatedPriceEur: 0,
  paymentIntentClientSecret: null,
  pendingBookingId: null,
  isLoading: false,

  setRoute: (route) => {
    set({ selectedRoute: route, step: 1, draft: defaultDraft });
  },

  setStep: (step) => set({ step }),

  setPackageDetails: (details) => {
    set((state) => ({ draft: { ...state.draft, ...details } }));
    get().computePrice();
  },

  setLogistics: (logistics) => {
    set((state) => ({ draft: { ...state.draft, ...logistics } }));
  },

  computePrice: () => {
    const { selectedRoute, draft } = get();
    if (!selectedRoute) return;
    const price = selectedRoute.price_per_kg_eur * draft.packageWeightKg;
    set({ calculatedPriceEur: Math.round(price * 100) / 100 });
  },

  createPaymentIntent: async (senderId) => {
    const { selectedRoute, draft, calculatedPriceEur } = get();
    if (!selectedRoute) throw new Error('No route selected');

    set({ isLoading: true });
    try {
      // First create a pending booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          sender_id: senderId,
          route_id: selectedRoute.id,
          package_weight_kg: draft.packageWeightKg,
          package_category: draft.packageCategory,
          package_photos: draft.packagePhotos,
          declared_value_eur: draft.declaredValueEur,
          pickup_type: draft.pickupType,
          pickup_address: draft.pickupAddress || null,
          dropoff_type: draft.dropoffType,
          dropoff_address: draft.dropoffAddress || null,
          price_eur: calculatedPriceEur,
          status: 'pending_payment',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;
      const bookingData = booking as unknown as { id: string };
      set({ pendingBookingId: bookingData.id });

      // Call Edge Function to create Stripe PaymentIntent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          bookingId: bookingData.id,
          amountEur: calculatedPriceEur,
          senderId,
          driverId: selectedRoute.driver_id,
        },
      });

      if (error) throw error;
      set({ paymentIntentClientSecret: data.clientSecret });
      return data.clientSecret as string;
    } finally {
      set({ isLoading: false });
    }
  },

  confirmBooking: async (paymentIntentId) => {
    const { pendingBookingId } = get();
    if (!pendingBookingId) throw new Error('No pending booking');

    const { error } = await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        payment_status: 'paid',
        status: 'confirmed',
      })
      .eq('id', pendingBookingId);

    if (error) throw error;
    return pendingBookingId;
  },

  reset: () =>
    set({
      selectedRoute: null,
      step: 1,
      draft: defaultDraft,
      calculatedPriceEur: 0,
      paymentIntentClientSecret: null,
      pendingBookingId: null,
      isLoading: false,
    }),
}));
