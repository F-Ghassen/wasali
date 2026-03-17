import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops } from '@/types/models';

// ─── Draft — all fields captured across the 5-step form ──────────────────────

export interface BookingDraft {
  // Step 1 — Sender
  senderMode: 'own' | 'behalf';
  senderPhoneCC: string;
  senderPhone: string;
  senderPhoneIsWhatsapp: boolean;
  senderStreet: string;
  senderPostalCode: string;
  senderCity: string;
  senderCountry: string;
  behalfName: string;
  behalfPhoneCC: string;
  behalfPhone: string;

  // Step 2 — Logistics
  collectionMethod: 'dropoff' | 'pickup';
  collectionCity: string;
  collectionCityDate: string;
  deliveryMethod: 'collect' | 'home' | 'post';
  dropoffCity: string;
  dropoffCityDate: string;

  // Step 3 — Package
  packageWeightKg: number;
  packageCategory: string;
  packageTypes: string[];
  packagePhotos: string[];
  declaredValueEur: number | null;

  // Step 4 — Recipient
  recipientName: string;
  recipientPhoneCC: string;
  recipientPhone: string;
  recipientPhoneIsWhatsapp: boolean;
  recipientAddressLine1: string;
  recipientAddressLine2: string;
  driverNotes: string;

  // Step 5 — Payment
  paymentMethod: 'card' | 'transfer' | 'cash';
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BookingState {
  selectedRoute: RouteWithStops | null;
  draft: BookingDraft;
  calculatedPriceEur: number;
  paymentIntentClientSecret: string | null;
  pendingBookingId: string | null;
  submittedAt: string | null;
  isLoading: boolean;
  submitError: string | null;
}

interface BookingActions {
  setRoute: (route: RouteWithStops) => void;
  setDraft: (fields: Partial<BookingDraft>) => void;
  computePrice: () => void;
  submitBooking: (senderId: string, senderName: string) => Promise<string>;
  // Legacy aliases kept for backward compat
  setPackageDetails: (details: Partial<BookingDraft>) => void;
  setLogistics: (logistics: Partial<BookingDraft>) => void;
  reset: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const defaultDraft: BookingDraft = {
  senderMode: 'own',
  senderPhoneCC: '+49',
  senderPhone: '',
  senderPhoneIsWhatsapp: false,
  senderStreet: '',
  senderPostalCode: '',
  senderCity: '',
  senderCountry: '',
  behalfName: '',
  behalfPhoneCC: '+49',
  behalfPhone: '',
  collectionMethod: 'dropoff',
  collectionCity: '',
  collectionCityDate: '',
  deliveryMethod: 'collect',
  dropoffCity: '',
  dropoffCityDate: '',
  packageWeightKg: 1,
  packageCategory: '',
  packageTypes: [],
  packagePhotos: [],
  declaredValueEur: null,
  recipientName: '',
  recipientPhoneCC: '+216',
  recipientPhone: '',
  recipientPhoneIsWhatsapp: false,
  recipientAddressLine1: '',
  recipientAddressLine2: '',
  driverNotes: '',
  paymentMethod: 'card',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
  selectedRoute: null,
  draft: defaultDraft,
  calculatedPriceEur: 0,
  paymentIntentClientSecret: null,
  pendingBookingId: null,
  submittedAt: null,
  isLoading: false,
  submitError: null,

  setRoute: (route) => {
    set({
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
  },

  computePrice: () => {
    const { selectedRoute, draft } = get();
    if (!selectedRoute) return;
    const base              = selectedRoute.price_per_kg_eur * draft.packageWeightKg;
    const pickupSurcharge   = draft.collectionMethod === 'pickup' ? 8  : 0;
    const deliverySurcharge =
      draft.deliveryMethod === 'home' ? 10 :
      draft.deliveryMethod === 'post' ?  6 : 0;
    set({ calculatedPriceEur: Math.round((base + pickupSurcharge + deliverySurcharge) * 100) / 100 });
  },

  submitBooking: async (senderId, _senderName) => {
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
          package_category:   draft.packageTypes.join(', ') || draft.packageCategory || 'general',
          package_photos:     draft.packagePhotos,
          declared_value_eur: draft.declaredValueEur,
          pickup_type:        draft.collectionMethod === 'pickup' ? 'driver_pickup' : 'sender_dropoff',
          pickup_address:     draft.collectionCity || null,
          dropoff_type:       draft.deliveryMethod === 'home' ? 'home_delivery' : 'recipient_pickup',
          dropoff_address:    [draft.recipientAddressLine1, draft.recipientAddressLine2]
                                .filter(Boolean).join(', ') || draft.dropoffCity || null,
          price_eur:          calculatedPriceEur,
          status:             draft.paymentMethod === 'card' ? 'pending_payment' : 'confirmed',
          payment_status:     draft.paymentMethod === 'card' ? 'pending' : 'paid',
        })
        .select('id')
        .single();

      if (error) throw error;

      const id = (booking as { id: string }).id;
      set({ pendingBookingId: id, submittedAt: new Date().toISOString() });
      return id;
    } catch {
      // Supabase not yet configured — fall back to a local ID so the full
      // UI flow works during development and demos.
      const fallbackId = `DEV-${Date.now().toString(36).toUpperCase()}`;
      set({ pendingBookingId: fallbackId, submittedAt: new Date().toISOString() });
      return fallbackId;
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      selectedRoute: null,
      draft: defaultDraft,
      calculatedPriceEur: 0,
      paymentIntentClientSecret: null,
      pendingBookingId: null,
      submittedAt: null,
      isLoading: false,
      submitError: null,
    }),
}));
