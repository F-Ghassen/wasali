import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops } from '@/types/models';

// ─── Draft — fields captured across the booking form ─────────────────────────

export interface BookingDraft {
  // Package
  packageWeightKg: number;
  packageCategory: string;
  packageTypes: string[];
  packagePhotos: string[];
  declaredValueEur: number | null;
  notes: string;

  // Logistics — field names match DB schema and screen expectations
  pickupType: 'driver_pickup' | 'sender_dropoff';
  pickupAddress: string;
  dropoffType: 'home_delivery' | 'recipient_pickup';
  dropoffAddress: string;

  // Recipient
  recipientName: string;
  recipientPhoneCC: string;
  recipientPhone: string;
  recipientPhoneIsWhatsapp: boolean;
  driverNotes: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BookingState {
  step: number;
  selectedRoute: RouteWithStops | null;
  draft: BookingDraft;
  calculatedPriceEur: number;
  pendingBookingId: string | null;
  submittedAt: string | null;
  isLoading: boolean;
  submitError: string | null;
}

interface BookingActions {
  setStep: (step: number) => void;
  setRoute: (route: RouteWithStops) => void;
  setDraft: (fields: Partial<BookingDraft>) => void;
  setPackageDetails: (details: Partial<BookingDraft>) => void;
  setLogistics: (logistics: Partial<BookingDraft>) => void;
  computePrice: () => void;
  submitBooking: (senderId: string) => Promise<string>;
  reset: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const defaultDraft: BookingDraft = {
  packageWeightKg: 1,
  packageCategory: '',
  packageTypes: [],
  packagePhotos: [],
  declaredValueEur: null,
  notes: '',
  pickupType: 'sender_dropoff',
  pickupAddress: '',
  dropoffType: 'home_delivery',
  dropoffAddress: '',
  recipientName: '',
  recipientPhoneCC: '+216',
  recipientPhone: '',
  recipientPhoneIsWhatsapp: false,
  driverNotes: '',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
  step: 1,
  selectedRoute: null,
  draft: defaultDraft,
  calculatedPriceEur: 0,
  pendingBookingId: null,
  submittedAt: null,
  isLoading: false,
  submitError: null,

  setStep: (step) => set({ step }),

  setRoute: (route) => {
    set({
      step: 1,
      selectedRoute: route,
      draft: defaultDraft,
      calculatedPriceEur: 0,
      pendingBookingId: null,
      submittedAt: null,
      submitError: null,
    });
  },

  setDraft: (fields) => {
    set((state) => ({ draft: { ...state.draft, ...fields } }));
  },

  setPackageDetails: (details) => {
    set((state) => ({ draft: { ...state.draft, ...details } }));
    get().computePrice();
  },

  setLogistics: (logistics) => {
    set((state) => ({ draft: { ...state.draft, ...logistics } }));
    get().computePrice();
  },

  computePrice: () => {
    const { selectedRoute, draft } = get();
    if (!selectedRoute) return;
    const base              = selectedRoute.price_per_kg_eur * draft.packageWeightKg;
    const pickupSurcharge   = draft.pickupType === 'driver_pickup' ? 8 : 0;
    const deliverySurcharge = draft.dropoffType === 'home_delivery' ? 10 : 0;
    set({ calculatedPriceEur: Math.round((base + pickupSurcharge + deliverySurcharge) * 100) / 100 });
  },

  submitBooking: async (senderId) => {
    const { selectedRoute, draft, calculatedPriceEur } = get();
    if (!selectedRoute) throw new Error('No route selected');

    set({ isLoading: true, submitError: null });
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          sender_id:          senderId,
          route_id:           selectedRoute.id,
          package_weight_kg:  draft.packageWeightKg,
          package_category:   draft.packageCategory || 'general',
          package_photos:     draft.packagePhotos,
          declared_value_eur: draft.declaredValueEur,
          pickup_type:        draft.pickupType,
          pickup_address:     draft.pickupAddress || null,
          dropoff_type:       draft.dropoffType,
          dropoff_address:    draft.dropoffAddress || null,
          recipient_name:     draft.recipientName || null,
          recipient_phone:    draft.recipientPhoneCC && draft.recipientPhone
                                ? draft.recipientPhoneCC + draft.recipientPhone
                                : null,
          driver_notes:       draft.driverNotes || null,
          price_eur:          calculatedPriceEur,
          status:             'pending',
          payment_status:     'pending',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', JSON.stringify(error));
        throw error;
      }

      const id = (booking as { id: string }).id;
      set({ pendingBookingId: id, submittedAt: new Date().toISOString() });
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      set({ submitError: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      step: 1,
      selectedRoute: null,
      draft: defaultDraft,
      calculatedPriceEur: 0,
      pendingBookingId: null,
      submittedAt: null,
      isLoading: false,
      submitError: null,
    }),
}));
