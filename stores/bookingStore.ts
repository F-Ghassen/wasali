import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops } from '@/types/models';

// ─── Last booking snapshot (for confirmation screen) ─────────────────────────

export interface LastBooking {
  id: string;
  totalPrice: number;
  collectionStopCity: string;
  dropoffStopCity: string;
  collectionStopDate: string;
  dropoffStopDate: string;
  collectionServiceType: string | null;
  deliveryServiceType: string | null;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageWeightKg: number;
  packageTypes: string[];
  paymentType: string;
  driverName: string | null;
  driverPhone: string | null;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BookingState {
  selectedRoute: RouteWithStops | null;
  isLoading: boolean;
  submitError: string | null;
  lastBooking: LastBooking | null;
}

interface BookingActions {
  setRoute: (route: RouteWithStops) => void;
  submitBooking: (payload: Record<string, unknown>) => Promise<string>;
  setLastBooking: (booking: LastBooking) => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>((set) => ({
  selectedRoute:  null,
  isLoading:      false,
  submitError:    null,
  lastBooking:    null,

  setRoute: (route) => set({ selectedRoute: route, submitError: null }),

  submitBooking: async (payload) => {
    set({ isLoading: true, submitError: null });
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(payload as any)
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', JSON.stringify(error));
        throw error;
      }

      const id = (booking as { id: string }).id;
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      set({ submitError: message });
      throw new Error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  setLastBooking: (booking) => set({ lastBooking: booking }),

  reset: () => set({
    selectedRoute: null,
    isLoading:     false,
    submitError:   null,
    lastBooking:   null,
  }),
}));
