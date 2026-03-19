-- Migration 017: DB trigger — notify users when a matching route becomes active

-- ─── Trigger function ────────────────────────────────────────────────────────
-- Fires after INSERT or UPDATE on routes.
-- When a route's status becomes 'active' for the first time, look up any
-- route_alerts rows that match origin_city + destination_city + date_from,
-- then insert a 'route_alert' notification for each matched user (excluding
-- the driver themselves).

CREATE OR REPLACE FUNCTION notify_route_alert_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only act when the row is transitioning INTO 'active'
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO notifications (user_id, type, message)
    SELECT
      ra.user_id,
      'route_alert',
      'A new route from ' || NEW.origin_city || ' to ' || NEW.destination_city
        || ' is available on ' || to_char(NEW.departure_date::date, 'Mon DD, YYYY') || '.'
    FROM route_alerts ra
    WHERE
      ra.origin_city      = NEW.origin_city
      AND ra.destination_city = NEW.destination_city
      -- If the alert has a date_from, only notify when the route departs on or after that date
      AND (ra.date_from IS NULL OR ra.date_from <= NEW.departure_date::date)
      -- Don't notify the driver who just published the route
      AND ra.user_id IS DISTINCT FROM NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Attach trigger ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS route_alert_trigger ON routes;

CREATE TRIGGER route_alert_trigger
  AFTER INSERT OR UPDATE OF status ON routes
  FOR EACH ROW
  EXECUTE FUNCTION notify_route_alert_users();
