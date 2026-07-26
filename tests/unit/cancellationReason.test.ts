import { describe, it, expect } from 'vitest';
import {
  CANCELLATION_REASON_LABELS,
  SENDER_CANCELLATION_REASON_MESSAGES,
  type CancellationReason,
} from '@/constants/bookingStatus';

// These maps MUST cover every value in the DB CHECK constraint
// bookings_cancellation_reason_check (migration 049). If a reason is added
// to the SQL, it must be added here too — the exhaustive test below fails
// loudly if a label is missing.

const ALL_REASONS: CancellationReason[] = [
  'sender_cancelled',
  'rejected_by_driver',
  'route_cancelled',
  'route_expired',
];

describe('cancellation reason labels', () => {
  it('has a driver-facing label for every reason', () => {
    for (const reason of ALL_REASONS) {
      expect(CANCELLATION_REASON_LABELS[reason]).toBeTruthy();
      expect(typeof CANCELLATION_REASON_LABELS[reason]).toBe('string');
    }
  });

  it('has a sender-facing message for every reason', () => {
    for (const reason of ALL_REASONS) {
      expect(SENDER_CANCELLATION_REASON_MESSAGES[reason]).toBeTruthy();
      expect(typeof SENDER_CANCELLATION_REASON_MESSAGES[reason]).toBe('string');
    }
  });

  it('distinguishes cascade reasons (route_*) from single-booking reasons', () => {
    // route_cancelled / route_expired come from the DB cascade trigger
    // (m049); sender_cancelled / rejected_by_driver come from a single
    // booking action. Labels must not collide, so UI can't misattribute.
    const labels = ALL_REASONS.map((r) => CANCELLATION_REASON_LABELS[r]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
