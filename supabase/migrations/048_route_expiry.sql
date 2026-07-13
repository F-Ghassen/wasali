-- Feature: route expiration. A route auto-expires once its departure date has
-- passed — a distinct 'expired' state, separate from 'completed' (trip done) and
-- 'cancelled' (driver aborted). Expired routes drop out of sender search (which
-- already filters status='active') and show as "Expired" in the driver's history.
-- Existing bookings are unaffected (bookings FK routes ON DELETE RESTRICT; only
-- the route's status changes).

-- 1. Allow the new status value.
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;
ALTER TABLE routes ADD CONSTRAINT routes_status_check
  CHECK (status IN ('draft','active','full','expired','cancelled','completed'));

-- 2. Permit active/full -> expired in the transition guard (m046). expired is
--    terminal. CREATE OR REPLACE keeps the existing trigger binding intact.
CREATE OR REPLACE FUNCTION enforce_route_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft'  AND NEW.status IN ('active','cancelled')) OR
      (OLD.status = 'active' AND NEW.status IN ('full','completed','cancelled','expired')) OR
      (OLD.status = 'full'   AND NEW.status IN ('active','completed','cancelled','expired'))
    ) THEN
      RAISE EXCEPTION 'Illegal route status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Nightly auto-expire via pg_cron. The job runs as its owner (bypasses the
--    app's RLS); the trigger above permits active/full -> expired.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: drop any prior schedule of the same name before (re)creating.
SELECT cron.unschedule('expire-routes')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-routes');

SELECT cron.schedule('expire-routes', '15 2 * * *', $job$
  UPDATE routes
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active','full')
    AND departure_date < CURRENT_DATE
$job$);

-- 4. Backfill: flip already-past routes now, not only on the next cron tick.
UPDATE routes
SET status = 'expired', updated_at = now()
WHERE status IN ('active','full')
  AND departure_date < CURRENT_DATE;
