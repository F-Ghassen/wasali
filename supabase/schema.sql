-- ============================================================
-- Wasali Database Schema
-- Run this in your Supabase SQL editor in order
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text,
  phone         text UNIQUE,
  phone_verified boolean NOT NULL DEFAULT false,
  avatar_url    text,
  stripe_customer_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Routes (driver cargo trips)
CREATE TABLE IF NOT EXISTS routes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  origin_city             text NOT NULL,
  origin_country          text NOT NULL,
  destination_city        text NOT NULL,
  destination_country     text NOT NULL,
  departure_date          date NOT NULL,
  estimated_arrival_date  date,
  available_weight_kg     numeric(8,2) NOT NULL CHECK (available_weight_kg > 0),
  min_weight_kg           numeric DEFAULT NULL,
  price_per_kg_eur        numeric(8,2) NOT NULL CHECK (price_per_kg_eur > 0),
  status                  text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','full','cancelled','completed')),
  notes                   text,
  -- payment & promo (migration 006)
  payment_methods         text[] NOT NULL DEFAULT ARRAY['cash_sender','cash_recipient','paypal','bank_transfer'],
  promo_discount_pct      smallint CHECK (promo_discount_pct BETWEEN 1 AND 99),
  promo_expires_at        date,
  promo_label             text,
  -- logistics options JSON array (migration 007)
  logistics_options       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- prohibited items (migration 008)
  prohibited_items        text[] NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS routes_search_idx ON routes (origin_city, destination_city, departure_date);

-- Route stops
CREATE TABLE IF NOT EXISTS route_stops (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id             uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  city                 text NOT NULL,
  country              text NOT NULL,
  stop_order           int NOT NULL,
  stop_type            text NOT NULL DEFAULT 'collection' CHECK (stop_type IN ('collection', 'dropoff')),
  arrival_date         date,
  meeting_point_url    text,
  is_pickup_available  boolean NOT NULL DEFAULT false,
  is_dropoff_available boolean NOT NULL DEFAULT false
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  route_id                  uuid NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
  package_weight_kg         numeric(8,2) NOT NULL CHECK (package_weight_kg > 0),
  package_category          text NOT NULL,
  package_photos            text[],
  pickup_type               text NOT NULL CHECK (pickup_type IN ('driver_pickup','sender_dropoff')),
  pickup_address            text,
  dropoff_type              text NOT NULL CHECK (dropoff_type IN ('home_delivery','recipient_pickup')),
  dropoff_address           text,
  declared_value_eur        numeric(10,2),
  price_eur                 numeric(10,2) NOT NULL CHECK (price_eur > 0),
  notes                     text,
  stripe_payment_intent_id  text,
  payment_status            text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  status                    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered','disputed','cancelled')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_sender_idx ON bookings (sender_id, created_at DESC);

-- Shipping requests
CREATE TABLE IF NOT EXISTS shipping_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  origin_city          text NOT NULL,
  origin_country       text NOT NULL,
  destination_city     text NOT NULL,
  destination_country  text NOT NULL,
  desired_date_from    date,
  desired_date_to      date,
  package_weight_kg    numeric(8,2) NOT NULL CHECK (package_weight_kg > 0),
  package_category     text NOT NULL,
  max_budget_eur       numeric(10,2),
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open','offer_accepted','expired','cancelled')),
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Shipping request offers
CREATE TABLE IF NOT EXISTS shipping_request_offers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            uuid NOT NULL REFERENCES shipping_requests(id) ON DELETE CASCADE,
  driver_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_price_eur    numeric(10,2) NOT NULL CHECK (proposed_price_eur > 0),
  proposed_pickup_date  date,
  message               text,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, driver_id)
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score       smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason        text NOT NULL,
  description   text NOT NULL,
  evidence_urls text[],
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Saved addresses
CREATE TABLE IF NOT EXISTS saved_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       text NOT NULL,
  street      text NOT NULL,
  city        text NOT NULL,
  country     text NOT NULL,
  postal_code text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_request_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- routes: anyone authenticated can browse active routes
CREATE POLICY "Authenticated can view active routes" ON routes FOR SELECT
  TO authenticated USING (status = 'active');

-- drivers can manage their own routes (all statuses)
CREATE POLICY "driver_insert_own_routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "driver_select_own_routes" ON routes
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "driver_update_own_routes" ON routes
  FOR UPDATE USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

-- route_stops: readable alongside routes
CREATE POLICY "Authenticated can view route stops" ON route_stops FOR SELECT
  TO authenticated USING (true);

-- drivers can manage stops on their own routes
CREATE POLICY "driver_insert_own_route_stops" ON route_stops
  FOR INSERT WITH CHECK (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

CREATE POLICY "driver_update_own_route_stops" ON route_stops
  FOR UPDATE USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

CREATE POLICY "driver_delete_own_route_stops" ON route_stops
  FOR DELETE USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

-- bookings
CREATE POLICY "Sender can view own bookings"   ON bookings FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Sender can insert bookings"     ON bookings FOR INSERT WITH CHECK (auth.uid() = sender_id);
-- Drivers can view bookings on their routes
CREATE POLICY "Driver can view bookings on their routes" ON bookings FOR SELECT
  USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );
-- Status / payment updates only via service_role (Edge Functions: stripe-webhook, capture-payment)

-- shipping_requests
CREATE POLICY "Sender can view own requests"   ON shipping_requests FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Sender can insert requests"     ON shipping_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Sender can cancel own request"  ON shipping_requests FOR UPDATE USING (auth.uid() = sender_id);

-- shipping_request_offers
CREATE POLICY "Sender can view offers on their requests" ON shipping_request_offers FOR SELECT
  USING (request_id IN (SELECT id FROM shipping_requests WHERE sender_id = auth.uid()));

-- ratings
CREATE POLICY "Sender can insert own ratings" ON ratings FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Anyone can read ratings"       ON ratings FOR SELECT TO authenticated USING (true);

-- disputes
CREATE POLICY "Sender can view own disputes"   ON disputes FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Sender can insert disputes"     ON disputes FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- saved_addresses
CREATE POLICY "Users can manage own addresses" ON saved_addresses FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Storage buckets (run in Supabase dashboard or CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('package-photos', 'package-photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-evidence', 'dispute-evidence', false);
