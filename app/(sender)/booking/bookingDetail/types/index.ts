import type { BookingWithRoute } from '@/types/models';
import type { BookingStatus } from '@/constants/bookingStatus';

export type BookingWithDriver = BookingWithRoute & {
  route?: BookingWithRoute['route'] & {
    estimated_arrival_date?: string | null;
    driver?: { full_name: string | null; phone: string | null } | null;
  };
  recipient_name?: string | null;
  recipient_phone?: string | null;
};

export type StepState = 'done' | 'current' | 'pending';

export const TIMELINE_STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'pending',    label: 'Booking received' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered',  label: 'Delivered' },
];
