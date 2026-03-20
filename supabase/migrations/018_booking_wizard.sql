-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 018: Booking Wizard Schema
-- Adds stop-level service binding, full sender/recipient fields, and total_price
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. route_stops — add location fields + city FK ─────────────────────────

ALTER TABLE route_stops
  ADD COLUMN IF NOT EXISTS location_name    text,
  ADD COLUMN IF NOT EXISTS location_address text,
  -- stop_date mirrors arrival_date cast to date (canonical booking-facing field)
  ADD COLUMN IF NOT EXISTS city_id          uuid
    REFERENCES cities(id) ON DELETE SET NULL;

-- stop_type values: 'collection' | 'dropoff'
-- is_pickup_available / is_dropoff_available kept for backwards compat

-- ─── 2. route_services — add route_stop_id FK ───────────────────────────────

ALTER TABLE route_services
  ADD COLUMN IF NOT EXISTS route_stop_id uuid
    REFERENCES route_stops(id) ON DELETE CASCADE;

-- NULL  route_stop_id = country-wide delivery service
-- non-NULL route_stop_id = city-specific collection service

CREATE INDEX IF NOT EXISTS route_services_stop_idx
  ON route_services (route_stop_id);

CREATE INDEX IF NOT EXISTS route_services_route_null_stop_idx
  ON route_services (route_id) WHERE route_stop_id IS NULL;

-- ─── 3. bookings — add missing columns ──────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS collection_stop_id uuid
    REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_stop_id    uuid
    REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_name        text,
  ADD COLUMN IF NOT EXISTS sender_phone       text,
  ADD COLUMN IF NOT EXISTS sender_whatsapp    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipient_whatsapp boolean NOT NULL DEFAULT false,
  -- total_price is the canonical computed total (weight × rate + surcharges)
  -- price_eur kept for backwards compat; new code writes both
  ADD COLUMN IF NOT EXISTS total_price        float;

-- Ensure status constraint covers all states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_transit','delivered','rated','cancelled'));

-- Drop ALL check constraints on payment_status (handles unnamed inline constraints from schema.sql)
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'bookings'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%payment_status%'
  LOOP
    EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(cname);
  END LOOP;
END;
$$;

-- Migrate legacy payment_status='pending' → 'unpaid'
UPDATE bookings SET payment_status = 'unpaid' WHERE payment_status = 'pending';

-- Add clean constraint (new canonical values)
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid','paid','captured','refunded','failed'));

-- ─── 4. recipients — ensure table + all columns exist ───────────────────────

CREATE TABLE IF NOT EXISTS recipients (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  phone               text        NOT NULL,
  whatsapp_enabled    boolean     NOT NULL DEFAULT false,
  address_street      text,
  address_city        text,
  address_postal_code text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipients_user_phone_key UNIQUE (user_id, phone)
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipients_user_all" ON recipients;
CREATE POLICY "recipients_user_all" ON recipients
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 5. RLS policies for new booking columns ────────────────────────────────
-- Existing bookings RLS covers the new columns automatically
-- (policies are row-level, not column-level in Postgres)

-- ─── 6. Useful indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS bookings_collection_stop_idx ON bookings (collection_stop_id);
CREATE INDEX IF NOT EXISTS bookings_dropoff_stop_idx    ON bookings (dropoff_stop_id);
CREATE INDEX IF NOT EXISTS route_stops_route_type_idx
  ON route_stops (route_id, stop_type, stop_order);
