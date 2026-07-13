-- Phase 0 reconciliation: make bookings.status canonical and unambiguous.
--
-- Background: migration 018 briefly set the CHECK to include 'rated' (and drop
-- 'disputed'), then 20260317_booking_status_pending.sql re-added 'disputed' and
-- dropped 'rated'. Because 20260317 sorts after 018 the effective set is already
-- the 6-value one, but the history is confusing and 'rated' may linger in data.
-- This migration asserts the single canonical set and eliminates any stray 'rated'.
--
-- Canonical set matches constants/bookingStatus.ts (BookingStatus).
-- Rating is tracked via the `ratings` table, NOT a booking status.

-- 1. Migrate any orphaned 'rated' rows to their true terminal state.
UPDATE bookings SET status = 'delivered' WHERE status = 'rated';

-- 2. Assert the canonical CHECK (idempotent: drop-then-add).
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_transit','delivered','disputed','cancelled'));

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';
