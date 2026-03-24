import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BookingWithDriver } from '../types/index';

export function useBookingDetail(bookingId: string | undefined) {
  const [booking, setBooking] = useState<BookingWithDriver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, route:routes(*, route_stops(*), driver:profiles!driver_id(full_name, phone))')
        .eq('id', bookingId)
        .single();
      setBooking(data as unknown as BookingWithDriver);
      setIsLoading(false);
    };

    load();

    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => setBooking((prev) => prev ? { ...prev, ...payload.new } : null)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  return { booking, isLoading };
}
