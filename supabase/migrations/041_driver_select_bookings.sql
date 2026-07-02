-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 041: Driver SELECT policy on bookings
--
-- Drivers had an UPDATE policy on bookings (from migration 005) but no SELECT
-- policy, so fetchBookings always returned an empty array.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Driver can view bookings on own routes" ON bookings
  FOR SELECT
  USING (
    route_id IN (SELECT id FROM routes WHERE driver_id = auth.uid())
  );
