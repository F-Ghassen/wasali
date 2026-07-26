import type { RouteStatus } from '@/types/models';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'captured' | 'refunded' | 'failed';

/**
 * Why a booking ended up 'cancelled'. Mirrors the CHECK constraint on
 * bookings.cancellation_reason (migration 049) and the four cancellation
 * paths in the codebase: sender self-cancel, driver manual reject, and the
 * two cascade sources (driver cancels the route / nightly expiry cron).
 */
export type CancellationReason =
  | 'sender_cancelled'
  | 'rejected_by_driver'
  | 'route_cancelled'
  | 'route_expired';

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

/** Legal route status transitions. Mirrors enforce_route_transition() (m046 + m048). */
export const LEGAL_ROUTE_TRANSITIONS: Record<RouteStatus, readonly RouteStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['full', 'completed', 'cancelled', 'expired'],
  full: ['active', 'completed', 'cancelled', 'expired'],
  expired: [],
  completed: [],
  cancelled: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return LEGAL_BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionRoute(from: RouteStatus, to: RouteStatus): boolean {
  return LEGAL_ROUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Short, driver-facing caption for a cancelled booking (used on
 * DriverBookingCard). Generic reason wording — the driver already knows
 * whether they did the cancelling.
 */
export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  sender_cancelled: 'Cancelled by sender',
  rejected_by_driver: 'Rejected by driver',
  route_cancelled: 'Route cancelled',
  route_expired: 'Route expired',
};

/**
 * Full sentence, sender-facing explanation for a cancelled booking (used on
 * the sender's booking detail screen). Phrased from the sender's point of
 * view — distinguishes "you did this" from "this happened to you".
 */
export const SENDER_CANCELLATION_REASON_MESSAGES: Record<CancellationReason, string> = {
  sender_cancelled: 'You cancelled this booking.',
  rejected_by_driver: 'The driver rejected your booking request.',
  route_cancelled: 'The driver cancelled the route — your booking was cancelled.',
  route_expired: 'This route expired before departure — your booking was cancelled.',
};

/** Cash payment types — the only methods that can be marked paid manually. */
export const CASH_PAYMENT_TYPES = ['cash_on_collection', 'cash_on_delivery'] as const;
export type CashPaymentType = (typeof CASH_PAYMENT_TYPES)[number];

export function isCashPaymentType(paymentType: string | null | undefined): paymentType is CashPaymentType {
  return paymentType === 'cash_on_collection' || paymentType === 'cash_on_delivery';
}
