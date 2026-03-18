import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { BookingWithSender } from '@/types/models';

type BookingFilter = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'all';

interface DriverBookingStats {
  pending: number;
  confirmed: number;
  inTransit: number;
  delivered: number;
  totalEarnings: number;
}

interface DriverBookingState {
  bookings: BookingWithSender[];
  stats: DriverBookingStats;
  isLoading: boolean;
  error: string | null;
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
  fetchBookings: (driverId: string, filter?: BookingFilter) => Promise<void>;
  confirmBooking: (id: string) => Promise<void>;
  rejectBooking: (id: string) => Promise<void>;
  markInTransit: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  computeStats: () => void;
  clearError: () => void;
  getRouteStats: (routeId: string) => RouteStats;
  getMonthlyRevenue: () => MonthlyRevenue[];
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
  error: null,

  clearError: () => set({ error: null }),

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

  fetchBookings: async (driverId, filter = 'all') => {
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
        set({ bookings: [], stats: emptyStats });
        return;
      }

      let query = supabase
        .from('bookings')
        .select('*, sender:profiles!sender_id(id, full_name, phone, avatar_url), route:routes!route_id(id, origin_city, destination_city, departure_date)')
        .in('route_id', routeIds)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ bookings: (data ?? []) as BookingWithSender[] });
      get().computeStats();
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  confirmBooking: async (id) => {
    await updateBookingStatus(id, 'confirmed', set, get);
  },

  rejectBooking: async (id) => {
    await updateBookingStatus(id, 'cancelled', set, get);
  },

  markInTransit: async (id) => {
    await updateBookingStatus(id, 'in_transit', set, get);
  },

  markDelivered: async (id) => {
    await updateBookingStatus(id, 'delivered', set, get);
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
