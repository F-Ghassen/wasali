-- Feature: cascading booking rejection on route expiry/cancellation.
--
-- Today, when a route auto-expires (nightly `expire-routes` cron, m048) or a
-- driver cancels it, existing pending/confirmed bookings are left untouched —
-- senders are left with a booking pointing at a dead route with no signal.
-- This migration:
--   1. Adds `cancellation_reason` to `bookings` (cancelled_at already exists,
--      m014) so every cancellation path records WHY, not just THAT.
--   2. Adds a trigger that cascades: when a route transitions into 'cancelled'
--      or 'expired', every pending/confirmed booking on it auto-cancels with
--      a reason tied to the route event, and confirmed bookings' capacity is
--      restored (mirrors the existing single-booking reject/cancel pattern).
--
-- The trigger fires on ANY route UPDATE that lands on cancelled/expired —
-- including the nightly cron's bulk UPDATE (m048) — since pg_cron's UPDATE
-- never goes through the app/store layer, only a DB-level trigger reliably
-- catches it. SECURITY DEFINER matches decrement/increment_route_capacity
-- (m013/m045) so it runs regardless of caller (driver session or cron owner).

-- 1. Reason column — one CHECK, reused by every cancellation path (sender
--    self-cancel, driver manual reject, route-cancel cascade, route-expiry
--    cascade). No separate boolean flags bolted on per-path.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_reason_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_cancellation_reason_check
  CHECK (cancellation_reason IS NULL OR cancellation_reason IN (
    'sender_cancelled', 'rejected_by_driver', 'route_cancelled', 'route_expired'
  ));

-- 2. Cascade trigger.
CREATE OR REPLACE FUNCTION cascade_cancel_bookings_on_route_terminal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reason text;
  b RECORD;
BEGIN
  -- Only react to a transition INTO a terminal state that should cascade.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('cancelled', 'expired') THEN
    reason := CASE NEW.status WHEN 'cancelled' THEN 'route_cancelled' ELSE 'route_expired' END;

    FOR b IN
      SELECT id, status, package_weight_kg FROM bookings
      WHERE route_id = NEW.id AND status IN ('pending', 'confirmed')
    LOOP
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = reason,
          cancelled_at = now(),
          updated_at = now()
      WHERE id = b.id;

      -- Restore capacity for bookings that had decremented it. Cosmetic for a
      -- terminal route (nothing will book it again) but keeps the ledger
      -- consistent with the single-booking reject/cancel behavior.
      IF b.status = 'confirmed' THEN
        PERFORM increment_route_capacity(NEW.id, COALESCE(b.package_weight_kg, 0));
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_cancel_bookings ON routes;
CREATE TRIGGER trg_cascade_cancel_bookings
  AFTER UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION cascade_cancel_bookings_on_route_terminal();

-- 3. Backfill: the nightly cron (m048) may have already expired routes with
--    stale pending/confirmed bookings before this trigger existed. Since the
--    trigger only fires on a NEW status transition, re-run it once here for
--    any route that's already in a terminal state with orphaned bookings.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT routes.id, routes.status
    FROM routes
    JOIN bookings ON bookings.route_id = routes.id
    WHERE routes.status IN ('cancelled', 'expired')
      AND bookings.status IN ('pending', 'confirmed')
  LOOP
    UPDATE bookings
    SET status = 'cancelled',
        cancellation_reason = CASE r.status WHEN 'cancelled' THEN 'route_cancelled' ELSE 'route_expired' END,
        cancelled_at = now(),
        updated_at = now()
    WHERE route_id = r.id AND status IN ('pending', 'confirmed');
  END LOOP;
END;
$$;
