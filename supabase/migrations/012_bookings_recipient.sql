-- Add recipient info + driver notes to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recipient_name   text,
  ADD COLUMN IF NOT EXISTS recipient_phone  text,
  ADD COLUMN IF NOT EXISTS driver_notes     text;
