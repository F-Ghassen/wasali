import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { BookingWithSender } from '@/types/models';
import { isCashPaymentType } from '@/constants/bookingStatus';

type BookingFilter = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'all';

interface DriverBookingStats {
  pending: number;
  confirmed: number;
  inTransit: number;
  delivered: number;
  totalEarnings: number;
}

const BOOKING_PAGE_SIZE = 15;

interface DriverBookingState {
  bookings: BookingWithSender[];
  stats: DriverBookingStats;
  isLoading: boolean;
  /** True once the first fetchBookings call for the current session has resolved. */
  isInitialized: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

export interface RouteStats {
  bookedKg: number;
  deliveredRevenue: number;
  deliveredCount: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface DriverBookingActions {
  fetchBookings: (driverId: string, filter?: BookingFilter, pageNum?: number, replace?: boolean) => Promise<void>;
  confirmBooking: (id: string) => Promise<void>;
  rejectBooking: (id: string) => Promise<void>;
  markInTransit: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  /** Mark a manual-payment booking (cash_on_collection / cash_on_delivery) as paid. */
  markPaid: (id: string) => Promise<void>;
  computeStats: () => void;
  clearError: () => void;
  getRouteStats: (routeId: string) => RouteStats;
  getMonthlyRevenue: () => MonthlyRevenue[];
  /** Call on sign-out so the next login starts with a clean slate. */
  reset: () => void;
}

const emptyStats: DriverBookingStats = {
  pending: 0,
  confirmed: 0,
  inTransit: 0,
  delivered: 0,
  totalEarnings: 0,
};

export const useDriverBookingStore = create<DriverBookingState & DriverBookingActions>((set, get) => ({
  bookings: [],
  stats: emptyStats,
  isLoading: false,
  isInitialized: false,
  error: null,
  hasMore: true,
  page: 0,

  clearError: () => set({ error: null }),

  reset: () => set({ bookings: [], stats: emptyStats, isInitialized: false, isLoading: false, error: null, page: 0, hasMore: true }),

  computeStats: () => {
    const { bookings } = get();
    const stats = bookings.reduce(
      (acc, b) => {
        if (b.status === 'pending') acc.pending++;
        else if (b.status === 'confirmed') acc.confirmed++;
        else if (b.status === 'in_transit') acc.inTransit++;
        else if (b.status === 'delivered') {
          acc.delivered++;
          acc.totalEarnings += b.price_eur ?? 0;
        }
        return acc;
      },
      { ...emptyStats }
    );
    set({ stats });
  },

  fetchBookings: async (driverId, filter = 'all', pageNum = 0, replace = true) => {
    set({ isLoading: true, error: null });
    try {
      // First get all route IDs for this driver
      const { data: routes, error: routeError } = await supabase
        .from('routes')
        .select('id')
        .eq('driver_id', driverId);
      if (routeError) throw routeError;

      const routeIds = (routes ?? []).map((r) => r.id);
      if (routeIds.length === 0) {
        set({ bookings: [], stats: emptyStats, hasMore: false, page: 0, isInitialized: true });
        return;
      }

      const from = pageNum * BOOKING_PAGE_SIZE;
      const to = from + BOOKING_PAGE_SIZE - 1;

      let query = supabase
        .from('bookings')
        .select('*, sender:profiles!sender_id(id, full_name, phone, avatar_url), route:routes!route_id(id, departure_date, estimated_arrival_date)')
        .in('route_id', routeIds)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const incoming = (data ?? []) as BookingWithSender[];
      set({
        bookings: replace ? incoming : [...get().bookings, ...incoming],
        hasMore: incoming.length === BOOKING_PAGE_SIZE,
        page: pageNum,
        isInitialized: true,
      });
      get().computeStats();
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  confirmBooking: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch booking to get route_id and package_weight_kg
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('route_id, package_weight_kg')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      // 2. Update booking status to confirmed
      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (statusError) throw statusError;

      // 3. Atomically decrement route capacity (guarded: WHERE available_weight_kg >= weight)
      const { error: rpcError } = await supabase.rpc('decrement_route_capacity', {
        p_route_id:  booking.route_id,
        p_weight_kg: booking.package_weight_kg ?? 0,
      });
      if (rpcError) {
        // Roll back: reset booking status to pending
        await supabase
          .from('bookings')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', id);
        throw new Error('Not enough capacity on this route. Booking reverted to pending.');
      }

      // 4. Auto-mark the route full if it can no longer accept the smallest
      //    bookable package (available < min_weight_kg, or <= 0).
      const { data: route } = await supabase
        .from('routes')
        .select('status, available_weight_kg, min_weight_kg')
        .eq('id', booking.route_id)
        .single();
      if (route && route.status === 'active') {
        const floor = route.min_weight_kg ?? 0;
        if (route.available_weight_kg <= 0 || route.available_weight_kg < floor) {
          await supabase
            .from('routes')
            .update({ status: 'full', updated_at: new Date().toISOString() })
            .eq('id', booking.route_id);
        }
      }

      set({
        bookings: get().bookings.map((b) =>
          b.id === id ? { ...b, status: 'confirmed' } : b
        ),
      });
      get().computeStats();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  rejectBooking: async (id) => {
    // Cancelling a *confirmed* booking must return its weight to the route pool
    // (confirm decremented it). Cancelling a *pending* booking never decremented,
    // so no restore. If the route was 'full', restoring capacity reopens it.
    set({ isLoading: true, error: null });
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('status, route_id, package_weight_kg')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const wasConfirmed = booking.status === 'confirmed';

      const { error: statusError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (statusError) throw statusError;

      if (wasConfirmed) {
        // Restore capacity, then reopen the route if it had been marked full.
        await supabase.rpc('increment_route_capacity', {
          p_route_id: booking.route_id,
          p_weight_kg: booking.package_weight_kg ?? 0,
        });
        const { data: route } = await supabase
          .from('routes')
          .select('status')
          .eq('id', booking.route_id)
          .single();
        if (route?.status === 'full') {
          await supabase
            .from('routes')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', booking.route_id);
        }
      }

      set({
        bookings: get().bookings.map((b) =>
          b.id === id ? { ...b, status: 'cancelled' } : b
        ),
      });
      get().computeStats();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  markInTransit: async (id) => {
    await updateBookingStatus(id, 'in_transit', set, get);
  },

  markDelivered: async (id) => {
    // Invoke capture-payment edge function — it authorizes the Stripe capture
    // and sets status='delivered' atomically on the server side.
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.functions.invoke('capture-payment', {
        body: { bookingId: id },
      });
      if (error) throw error;

      set({
        bookings: get().bookings.map((b) =>
          b.id === id ? { ...b, status: 'delivered' } : b
        ),
      });
      get().computeStats();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  markPaid: async (id) => {
    // Cash-only: recording receipt of cash handed directly to the driver.
    // Guarded here (fail fast) and at the DB (enforce_booking_transition, m046).
    set({ isLoading: true, error: null });
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('payment_type')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (!isCashPaymentType(booking.payment_type)) {
        throw new Error('Only cash bookings can be marked paid manually.');
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid', paid_at: now, updated_at: now })
        .eq('id', id);
      if (error) throw error;

      set({
        bookings: get().bookings.map((b) =>
          b.id === id ? { ...b, payment_status: 'paid', paid_at: now } : b
        ),
      });
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  getRouteStats: (routeId) => {
    const { bookings } = get();
    return bookings
      .filter((b) => b.route_id === routeId)
      .reduce<RouteStats>(
        (acc, b) => {
          acc.bookedKg += b.package_weight_kg ?? 0;
          if (b.status === 'delivered') {
            acc.deliveredRevenue += b.price_eur ?? 0;
            acc.deliveredCount++;
          }
          return acc;
        },
        { bookedKg: 0, deliveredRevenue: 0, deliveredCount: 0 }
      );
  },

  getMonthlyRevenue: () => {
    const { bookings } = get();
    const delivered = bookings.filter((b) => b.status === 'delivered');

    // Build a map of YYYY-MM → revenue for last 6 calendar months
    const now = new Date();
    const months: MonthlyRevenue[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      months.push({ month: label, revenue: 0, _key: key } as MonthlyRevenue & { _key: string });
    }

    for (const b of delivered) {
      if (!b.created_at) continue;
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = (months as (MonthlyRevenue & { _key: string })[]).find((m) => m._key === key);
      if (entry) entry.revenue += b.price_eur ?? 0;
    }

    // Strip internal _key before returning
    return months.map(({ month, revenue }) => ({ month, revenue }));
  },
}));

async function updateBookingStatus(
  id: string,
  status: string,
  set: (partial: Partial<DriverBookingState>) => void,
  get: () => DriverBookingState & DriverBookingActions
) {
  set({ isLoading: true, error: null });
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    set({
      bookings: get().bookings.map((b) =>
        b.id === id ? { ...b, status } : b
      ),
    });
    get().computeStats();
  } catch (err) {
    set({ error: (err as Error).message });
    throw err;
  } finally {
    set({ isLoading: false });
  }
}
