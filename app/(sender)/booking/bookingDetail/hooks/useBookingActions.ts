import { Alert, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { formatDate, formatPrice } from '@/utils/formatters';
import type { BookingWithDriver } from '../types/index';
import { getOriginCity, getDestinationCity } from '../utils/routeCities';

export function useBookingActions(bookingId: string | undefined, profile: any) {
  const cancelBooking = async (): Promise<boolean> => {
    if (!bookingId) return false;
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select('id, status');
    if (error || !data || data.length === 0) return false;
    return true;
  };

  const handleWhatsApp = (booking: BookingWithDriver) => {
    const phone = booking.route?.driver?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'The driver has not shared a phone number.');
      return;
    }
    const ref = bookingId ? `#BOOK-${bookingId.slice(0, 8).toUpperCase()}` : '';
    const lines = [
      `📦 Booking ${ref}`,
      ``,
      `🗺  Route: ${getOriginCity(booking)} → ${getDestinationCity(booking)}`,
      booking.route?.departure_date ? `📅 Departure: ${formatDate(booking.route.departure_date)}` : null,
      ``,
      `⚖️  Weight: ${booking.package_weight_kg} kg`,
      booking.package_category ? `📦 Category: ${booking.package_category}` : null,
      `💶 Total: ${formatPrice(booking.price_eur)}`,
    ].filter(Boolean).join('\n');

    const normalised = phone.replace(/\s+/g, '');
    Linking.openURL(`whatsapp://send?phone=${normalised}&text=${encodeURIComponent(lines)}`).catch(() =>
      Alert.alert('WhatsApp not available', 'Could not open WhatsApp.')
    );
  };

  return { handleWhatsApp, cancelBooking };
}
