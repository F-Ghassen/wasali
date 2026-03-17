-- Replace pending_payment status with pending (driver-confirmed flow)
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_transit','delivered','disputed','cancelled'));

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending';

-- Migrate any existing pending_payment rows
UPDATE bookings SET status = 'pending' WHERE status = 'pending_payment';
