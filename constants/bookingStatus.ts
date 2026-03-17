export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  pending: {
    label: 'Awaiting Driver',
    color: '#F39C12',
    bgColor: '#FEF9E7',
    icon: '⏳',
    description: 'Waiting for the driver to confirm your booking',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#27AE60',
    bgColor: '#E8F8EF',
    icon: '✅',
    description: 'Your booking is confirmed and scheduled',
  },
  in_transit: {
    label: 'In Transit',
    color: '#1A6FA8',
    bgColor: '#E6F4FE',
    icon: '🚛',
    description: 'Your package is on its way',
  },
  delivered: {
    label: 'Delivered',
    color: '#27AE60',
    bgColor: '#E8F8EF',
    icon: '📦',
    description: 'Package has been delivered',
  },
  disputed: {
    label: 'Disputed',
    color: '#E74C3C',
    bgColor: '#FDEDEC',
    icon: '⚠️',
    description: 'A dispute has been raised',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '❌',
    description: 'This booking was cancelled',
  },
};
