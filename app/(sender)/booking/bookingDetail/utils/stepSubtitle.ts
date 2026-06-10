import { formatDate } from '@/utils/formatters';
import type { BookingStatus } from '@/constants/bookingStatus';
import type { BookingWithDriver, StepState } from '../types/index';
import { getDestinationCity } from './routeCities';

export function stepSubtitle(
  key: BookingStatus,
  state: StepState,
  booking: BookingWithDriver,
): string {
  const destCity  = getDestinationCity(booking);
  const weightKg  = booking.package_weight_kg ?? 0;
  const updatedAt = booking.updated_at ? formatDate(booking.updated_at as string) : undefined;

  switch (key) {
    case 'pending':
      return 'Awaiting driver confirmation';
    case 'confirmed':
      return state === 'done' || state === 'current'
        ? `${updatedAt ? updatedAt + ' · ' : ''}Payment secured in escrow`
        : 'Payment will be held in escrow';
    case 'in_transit':
      return state === 'done' || state === 'current'
        ? `${updatedAt ? updatedAt + ' · ' : ''}${weightKg} kg · En route to ${destCity}`
        : `En route to ${destCity}`;
    case 'delivered':
      return state === 'done'
        ? `${updatedAt ? updatedAt + ' · ' : ''}Confirmed by driver`
        : state === 'current'
        ? 'Confirming delivery…'
        : 'Pending';
    default:
      return '';
  }
}
