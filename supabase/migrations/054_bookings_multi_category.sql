-- Migration 054: Preserve every selected package category, not just the first.
--
-- hooks/useBookingForm.ts's buildSubmitPayload set
-- `package_category: state.packageTypes[0] ?? 'general'` — if a sender
-- selected multiple categories (e.g. "Clothing" + "Electronics"), only the
-- first ever reached the database; the rest were silently dropped. This
-- surfaced as "driver booking detail only shows one category despite the
-- user selecting multiple."
--
-- Fix: add package_categories text[], populated with the full selection
-- going forward. package_category (singular) is kept as-is for existing
-- consumers (BookingCard, DriverBookingCard list, shipping-requests) —
-- least-invasive, no rename. Backfill existing rows from the single value
-- so old bookings still show (at least) their one known category.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_categories text[] NOT NULL DEFAULT '{}';

UPDATE bookings
  SET package_categories = ARRAY[package_category]
  WHERE package_categories = '{}';
