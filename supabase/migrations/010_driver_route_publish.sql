-- Migration 010: Driver route publish
-- Adds RLS policies so drivers can create, read, and manage their own routes.
-- Also introduces a 'draft' status so drivers can save before publishing.

-- ─────────────────────────────────────────
-- 1. Add 'draft' status to routes
-- ─────────────────────────────────────────
-- Drop the existing CHECK constraint and recreate it with 'draft' included.
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;
ALTER TABLE routes ADD CONSTRAINT routes_status_check
  CHECK (status IN ('draft', 'active', 'full', 'cancelled', 'completed'));

-- ─────────────────────────────────────────
-- 2. Driver RLS on routes
-- ─────────────────────────────────────────

-- Drivers can insert their own routes
CREATE POLICY "driver_insert_own_routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- Drivers can view ALL of their own routes (draft, active, full, cancelled, completed)
CREATE POLICY "driver_select_own_routes" ON routes
  FOR SELECT USING (auth.uid() = driver_id);

-- Drivers can update their own routes (edit pricing, cancel, mark full, complete, publish)
CREATE POLICY "driver_update_own_routes" ON routes
  FOR UPDATE USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

-- ─────────────────────────────────────────
-- 3. Driver RLS on route_stops
-- ─────────────────────────────────────────

-- Drivers can insert stops for their own routes
CREATE POLICY "driver_insert_own_route_stops" ON route_stops
  FOR INSERT WITH CHECK (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

-- Drivers can update stops on their own routes
CREATE POLICY "driver_update_own_route_stops" ON route_stops
  FOR UPDATE USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );

-- Drivers can delete stops on their own routes
CREATE POLICY "driver_delete_own_route_stops" ON route_stops
  FOR DELETE USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );