import { describe, it, expect } from 'vitest';
import {
  canTransitionBooking,
  canTransitionRoute,
  isCashPaymentType,
  LEGAL_BOOKING_TRANSITIONS,
  LEGAL_ROUTE_TRANSITIONS,
  type BookingStatus,
} from '@/constants/bookingStatus';
import type { RouteStatus } from '@/types/models';

// These maps MUST mirror the DB triggers enforce_booking_transition() and
// enforce_route_transition() in migration 046. If a transition changes in the
// SQL, it changes here too.

const ALL_BOOKING: BookingStatus[] = [
  'pending', 'confirmed', 'in_transit', 'delivered', 'disputed', 'cancelled',
];
const ALL_ROUTE: RouteStatus[] = ['draft', 'active', 'full', 'expired', 'completed', 'cancelled'];

describe('booking transitions', () => {
  it('allows every legal transition', () => {
    expect(canTransitionBooking('pending', 'confirmed')).toBe(true);
    expect(canTransitionBooking('pending', 'cancelled')).toBe(true);
    expect(canTransitionBooking('confirmed', 'in_transit')).toBe(true);
    expect(canTransitionBooking('confirmed', 'cancelled')).toBe(true);
    expect(canTransitionBooking('confirmed', 'disputed')).toBe(true);
    expect(canTransitionBooking('in_transit', 'delivered')).toBe(true);
    expect(canTransitionBooking('in_transit', 'disputed')).toBe(true);
    expect(canTransitionBooking('delivered', 'disputed')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransitionBooking('pending', 'in_transit')).toBe(false);
    expect(canTransitionBooking('pending', 'delivered')).toBe(false);
    expect(canTransitionBooking('delivered', 'in_transit')).toBe(false);
    expect(canTransitionBooking('cancelled', 'pending')).toBe(false);
    expect(canTransitionBooking('in_transit', 'cancelled')).toBe(false); // must dispute
  });

  it('terminal states allow no transitions', () => {
    expect(LEGAL_BOOKING_TRANSITIONS.cancelled).toHaveLength(0);
    expect(LEGAL_BOOKING_TRANSITIONS.disputed).toHaveLength(0);
  });

  it('exhaustive: no self-transitions and every target is a valid status', () => {
    for (const from of ALL_BOOKING) {
      for (const to of LEGAL_BOOKING_TRANSITIONS[from]) {
        expect(from).not.toBe(to);
        expect(ALL_BOOKING).toContain(to);
      }
    }
  });
});

describe('route transitions', () => {
  it('allows every legal transition', () => {
    expect(canTransitionRoute('draft', 'active')).toBe(true);
    expect(canTransitionRoute('draft', 'cancelled')).toBe(true);
    expect(canTransitionRoute('active', 'full')).toBe(true);
    expect(canTransitionRoute('active', 'completed')).toBe(true);
    expect(canTransitionRoute('active', 'cancelled')).toBe(true);
    expect(canTransitionRoute('full', 'active')).toBe(true); // reopen on cancel
    expect(canTransitionRoute('full', 'completed')).toBe(true);
    expect(canTransitionRoute('full', 'cancelled')).toBe(true);
    // Auto-expire edges (m048) — mirror enforce_route_transition().
    expect(canTransitionRoute('active', 'expired')).toBe(true);
    expect(canTransitionRoute('full', 'expired')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransitionRoute('draft', 'full')).toBe(false);
    expect(canTransitionRoute('draft', 'completed')).toBe(false);
    expect(canTransitionRoute('completed', 'active')).toBe(false);
    expect(canTransitionRoute('cancelled', 'active')).toBe(false);
    expect(canTransitionRoute('draft', 'expired')).toBe(false); // only active/full expire
    expect(canTransitionRoute('expired', 'active')).toBe(false); // expired is terminal
  });

  it('terminal states allow no transitions', () => {
    expect(LEGAL_ROUTE_TRANSITIONS.completed).toHaveLength(0);
    expect(LEGAL_ROUTE_TRANSITIONS.cancelled).toHaveLength(0);
    expect(LEGAL_ROUTE_TRANSITIONS.expired).toHaveLength(0);
  });

  it('exhaustive: every target is a valid status', () => {
    for (const from of ALL_ROUTE) {
      for (const to of LEGAL_ROUTE_TRANSITIONS[from]) {
        expect(from).not.toBe(to);
        expect(ALL_ROUTE).toContain(to);
      }
    }
  });
});

describe('cash payment guard', () => {
  it('accepts only cash types', () => {
    expect(isCashPaymentType('cash_on_collection')).toBe(true);
    expect(isCashPaymentType('cash_on_delivery')).toBe(true);
    expect(isCashPaymentType('credit_debit_card')).toBe(false);
    expect(isCashPaymentType('paypal')).toBe(false);
    expect(isCashPaymentType(null)).toBe(false);
    expect(isCashPaymentType(undefined)).toBe(false);
  });
});
