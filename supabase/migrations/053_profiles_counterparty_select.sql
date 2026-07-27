-- Migration 053: Let a user view their booking counterparty's profile.
--
-- Root cause of "sender info not shown on driver booking detail" (and,
-- symmetrically, the driver's name/phone never rendering on the sender's
-- booking detail either): the only SELECT policy on `profiles` is
-- "Users can view own profile" (auth.uid() = id, added in migration 038).
-- Every embedded-resource join like
--   sender:profiles!sender_id(...)   (stores/driverBookingStore.ts)
--   driver:profiles!driver_id(...)   (app/(sender)/booking/bookingDetail/hooks/useBookingDetail.ts)
-- is filtered by RLS *on the joined table*, not just the top-level one — so
-- a driver querying `bookings` can see the booking row, but the nested
-- `sender:profiles(...)` comes back null because RLS on `profiles` blocks
-- reading anyone else's row. The client never errors; it just silently
-- gets a null/empty relation.
--
-- Fix: add a second, narrowly-scoped SELECT policy. Postgres RLS combines
-- multiple permissive policies on the same table with OR, so this is
-- additive to (never replaces) "Users can view own profile" — a user can
-- now ALSO see the profile of the other party on any booking that connects
-- them, in either direction:
--   • Driver → sender: any sender_id on a booking whose route the driver owns.
--   • Sender → driver: any driver_id on a route the sender has a booking on.
-- No other rows become visible; the counterparty relationship must exist.

CREATE POLICY "Users can view booking counterparty profile" ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT b.sender_id
      FROM bookings b
      JOIN routes r ON r.id = b.route_id
      WHERE r.driver_id = auth.uid()
    )
    OR
    id IN (
      SELECT r.driver_id
      FROM routes r
      JOIN bookings b ON b.route_id = r.id
      WHERE b.sender_id = auth.uid()
    )
  );
