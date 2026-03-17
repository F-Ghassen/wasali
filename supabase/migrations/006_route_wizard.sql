-- Migration 006: Route Wizard enhancements
-- Adds payment methods, promo pricing, stop types, meeting point URLs, and route templates

-- ─────────────────────────────────────────
-- 1. routes table additions
-- ─────────────────────────────────────────
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT ARRAY['cash_sender','cash_recipient','paypal','bank_transfer'],
  ADD COLUMN IF NOT EXISTS promo_discount_pct smallint CHECK (promo_discount_pct BETWEEN 1 AND 99),
  ADD COLUMN IF NOT EXISTS promo_expires_at date,
  ADD COLUMN IF NOT EXISTS promo_label text;

-- ─────────────────────────────────────────
-- 2. route_stops table additions
-- ─────────────────────────────────────────
ALTER TABLE route_stops
  ADD COLUMN IF NOT EXISTS meeting_point_url text,
  ADD COLUMN IF NOT EXISTS stop_type text NOT NULL DEFAULT 'collection'
    CHECK (stop_type IN ('collection', 'dropoff'));

-- ─────────────────────────────────────────
-- 3. route_templates table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  origin_city         text NOT NULL,
  origin_country      text NOT NULL,
  destination_city    text NOT NULL,
  destination_country text NOT NULL,
  available_weight_kg decimal NOT NULL,
  price_per_kg_eur    decimal NOT NULL,
  payment_methods     text[] NOT NULL DEFAULT ARRAY['cash_sender','cash_recipient','paypal','bank_transfer'],
  notes               text,
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- 4. RLS on route_templates
-- ─────────────────────────────────────────
ALTER TABLE route_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_select_own_templates" ON route_templates
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "driver_insert_own_templates" ON route_templates
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "driver_update_own_templates" ON route_templates
  FOR UPDATE USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "driver_delete_own_templates" ON route_templates
  FOR DELETE USING (auth.uid() = driver_id);
