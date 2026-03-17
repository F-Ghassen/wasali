-- ============================================================
-- Migration 005: Driver role support
-- ============================================================

-- 1. Add role column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'sender'
    CHECK (role IN ('sender', 'driver'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- 2. Update handle_new_user trigger to capture role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'sender')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Driver RLS policies on routes
CREATE POLICY "Driver can view own routes" ON routes FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Driver can insert routes" ON routes FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Driver can update own routes" ON routes FOR UPDATE
  USING (driver_id = auth.uid());

-- 4. Driver RLS policies on route_stops
CREATE POLICY "Driver can insert route stops" ON route_stops FOR INSERT
  WITH CHECK (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

CREATE POLICY "Driver can update route stops" ON route_stops FOR UPDATE
  USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

CREATE POLICY "Driver can delete route stops" ON route_stops FOR DELETE
  USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

-- 5. Driver can update booking status on their routes
CREATE POLICY "Driver can update bookings on own routes" ON bookings FOR UPDATE
  USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

-- 6. Driver can manage own shipping request offers
CREATE POLICY "Driver can view own offers" ON shipping_request_offers FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Driver can insert offers" ON shipping_request_offers FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Driver can update own offers" ON shipping_request_offers FOR UPDATE
  USING (driver_id = auth.uid());

-- 7. Drivers can view open shipping requests to make offers
CREATE POLICY "Authenticated can view open shipping requests" ON shipping_requests FOR SELECT
  TO authenticated USING (status = 'open');
