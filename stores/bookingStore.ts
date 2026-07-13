import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RouteWithStops } from '@/types/models';
import { bookingSubmitSchema } from '@/utils/validators';
import { splitBookingMoney } from '@/utils/money';

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

export interface DisputeInput {
  bookingId: string;
  senderId: string;
  reason: string;
  description: string;
}

interface BookingActions {
  setRoute: (route: RouteWithStops) => void;
  /** Fetch a route by id into selectedRoute — used for cold deep-links where
   *  the in-memory route wasn't set by search results. */
  loadRouteById: (routeId: string) => Promise<void>;
  submitBooking: (payload: Record<string, unknown>) => Promise<string>;
  setLastBooking: (booking: LastBooking) => void;
  /** File a dispute for a delivered booking. Throws on failure. */
  submitDispute: (input: DisputeInput) => Promise<void>;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState & BookingActions>((set) => ({
  selectedRoute:  null,
  isLoading:      false,
  submitError:    null,
  lastBooking:    null,

  setRoute: (route) => set({ selectedRoute: route, submitError: null }),

  loadRouteById: async (routeId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*, route_stops(*), route_services(*), route_payment_methods(*)')
        .eq('id', routeId)
        .single();
      if (error) throw error;
      set({ selectedRoute: data as RouteWithStops });
    } catch {
      // Leave selectedRoute null — the screen shows its not-found state.
    } finally {
      set({ isLoading: false });
    }
  },

  submitBooking: async (payload) => {
    set({ isLoading: true, submitError: null });
    try {
      // 1. Validate the payload at the boundary (cash-only, required fields).
      const parsed = bookingSubmitSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid booking details');
      }

      // 2. Compute the money split from server-side rates. The client's
      //    total_price is the shipping subtotal (no fee applied client-side);
      //    splitBookingMoney derives the sender total and driver payout. At
      //    launch both rates are 0, so total_price is unchanged.
      const { data: config } = await supabase
        .from('platform_config')
        .select('service_fee_rate_pct, driver_commission_rate_pct')
        .eq('id', 1)
        .single();

      const money = splitBookingMoney({
        shipping: parsed.data.total_price,
        serviceFeeRatePct: config?.service_fee_rate_pct ?? 0,
        driverCommissionRatePct: config?.driver_commission_rate_pct ?? 0,
      });

      const insertPayload = {
        ...payload,
        shipping_eur: money.shippingEur,
        service_fee_eur: money.serviceFeeEur,
        total_price: money.totalPrice,
        price_eur: money.totalPrice,
        driver_commission_eur: money.driverCommissionEur,
        driver_payout_eur: money.driverPayoutEur,
        service_fee_rate_pct: money.serviceFeeRatePct,
        driver_commission_rate_pct: money.driverCommissionRatePct,
      };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(insertPayload as any)
        .select('id')
        .single();

      if (error) {
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

  submitDispute: async ({ bookingId, senderId, reason, description }) => {
    const { error } = await supabase.from('disputes').insert({
      booking_id: bookingId,
      sender_id: senderId,
      reason,
      description,
      status: 'open',
    });
    if (error) throw error;
  },

  reset: () => set({
    selectedRoute: null,
    isLoading:     false,
    submitError:   null,
    lastBooking:   null,
  }),
}));
