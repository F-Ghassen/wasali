import type { RouteStatus } from '@/types/models';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'captured' | 'refunded' | 'failed';

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

/**
 * Legal booking status transitions. MUST mirror the DB trigger
 * enforce_booking_transition() in migration 046. Client-side guards use this to
 * fail fast; the trigger is the authoritative enforcement. See the blueprint §2b.
 */
export const LEGAL_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_transit', 'cancelled', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['disputed'],
  disputed: [],
  cancelled: [],
};

/** Legal route status transitions. Mirrors enforce_route_transition() (m046). */
export const LEGAL_ROUTE_TRANSITIONS: Record<RouteStatus, readonly RouteStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['full', 'completed', 'cancelled'],
  full: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return LEGAL_BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionRoute(from: RouteStatus, to: RouteStatus): boolean {
  return LEGAL_ROUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Cash payment types — the only methods that can be marked paid manually. */
export const CASH_PAYMENT_TYPES = ['cash_on_collection', 'cash_on_delivery'] as const;
export type CashPaymentType = (typeof CASH_PAYMENT_TYPES)[number];

export function isCashPaymentType(paymentType: string | null | undefined): paymentType is CashPaymentType {
  return paymentType === 'cash_on_collection' || paymentType === 'cash_on_delivery';
}
