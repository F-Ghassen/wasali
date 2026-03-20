-- ─── Migration 014: Route services, payment methods, and extended columns ────

-- 1. Add new columns to routes
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS max_single_package_kg float;

-- 2. Create route_services table
CREATE TABLE IF NOT EXISTS route_services (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id          uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  service_type      text NOT NULL CHECK (service_type IN (
                      'sender_dropoff', 'driver_pickup',
                      'recipient_collects', 'driver_delivery', 'local_post'
                    )),
  price_eur         float NOT NULL DEFAULT 0,
  location_name     text,
  location_address  text,
  instructions      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS for route_services
ALTER TABLE route_services ENABLE ROW LEVEL SECURITY;

-- Anyone can read services for active/full routes
CREATE POLICY "route_services_public_select"
  ON route_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_services.route_id
        AND r.status IN ('active', 'full')
    )
  );

-- Drivers can manage their own route services
CREATE POLICY "route_services_driver_all"
  ON route_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_services.route_id
        AND r.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_services.route_id
        AND r.driver_id = auth.uid()
    )
  );

-- 3. Create route_payment_methods table
CREATE TABLE IF NOT EXISTS route_payment_methods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  payment_type  text NOT NULL CHECK (payment_type IN (
                  'cash_on_collection', 'cash_on_delivery',
                  'credit_debit_card', 'paypal'
                )),
  enabled       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, payment_type)
);

-- RLS for route_payment_methods
ALTER TABLE route_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_payment_methods_public_select"
  ON route_payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_payment_methods.route_id
        AND r.status IN ('active', 'full')
    )
  );

CREATE POLICY "route_payment_methods_driver_all"
  ON route_payment_methods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_payment_methods.route_id
        AND r.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_payment_methods.route_id
        AND r.driver_id = auth.uid()
    )
  );

-- 4. Extend bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS collection_service_id      uuid REFERENCES route_services(id),
  ADD COLUMN IF NOT EXISTS delivery_service_id        uuid REFERENCES route_services(id),
  ADD COLUMN IF NOT EXISTS sender_address_street      text,
  ADD COLUMN IF NOT EXISTS sender_address_city        text,
  ADD COLUMN IF NOT EXISTS sender_address_postal_code text,
  ADD COLUMN IF NOT EXISTS recipient_address_street      text,
  ADD COLUMN IF NOT EXISTS recipient_address_city        text,
  ADD COLUMN IF NOT EXISTS recipient_address_postal_code text,
  ADD COLUMN IF NOT EXISTS estimated_collection_date  date,
  ADD COLUMN IF NOT EXISTS cancellation_reason        text,
  ADD COLUMN IF NOT EXISTS cancelled_at               timestamptz,
  ADD COLUMN IF NOT EXISTS payment_type               text;

-- 5. Create recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  phone               text NOT NULL,
  whatsapp_enabled    boolean NOT NULL DEFAULT false,
  address_street      text,
  address_city        text,
  address_postal_code text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone)
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipients_user_all"
  ON recipients FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Create route_alerts table
CREATE TABLE IF NOT EXISTS route_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  origin_city      text NOT NULL,
  destination_city text NOT NULL,
  date_from        date,
  date_to          date,
  min_weight_kg    float,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE route_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_alerts_user_all"
  ON route_alerts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Create saved_routes table
CREATE TABLE IF NOT EXISTS saved_routes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id   uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, route_id)
);

ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_routes_user_all"
  ON saved_routes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
