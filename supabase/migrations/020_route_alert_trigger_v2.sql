-- Migration 020: Update route_alert trigger to match on city_id when available,
--               fall back to text match for rows not yet backfilled.
-- This migration MUST run after migration 019 (which adds origin_city_id,
-- destination_city_id columns to the routes table).

CREATE OR REPLACE FUNCTION notify_route_alert_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    INSERT INTO notifications (user_id, type, message)
    SELECT
      ra.user_id,
      'route_alert',
      'A new route from ' || NEW.origin_city || ' to ' || NEW.destination_city
        || ' is available on ' || to_char(NEW.departure_date::date, 'Mon DD, YYYY') || '.'
    FROM route_alerts ra
    WHERE
      -- Match on city_id when both sides have it; fall back to text otherwise
      (
        (ra.origin_city_id IS NOT NULL AND NEW.origin_city_id IS NOT NULL
          AND ra.origin_city_id = NEW.origin_city_id)
        OR
        (ra.origin_city_id IS NULL OR NEW.origin_city_id IS NULL)
          AND ra.origin_city = NEW.origin_city
      )
      AND
      (
        (ra.destination_city_id IS NOT NULL AND NEW.destination_city_id IS NOT NULL
          AND ra.destination_city_id = NEW.destination_city_id)
        OR
        (ra.destination_city_id IS NULL OR NEW.destination_city_id IS NULL)
          AND ra.destination_city = NEW.destination_city
      )
      AND (ra.date_from IS NULL OR ra.date_from <= NEW.departure_date::date)
      AND ra.user_id IS DISTINCT FROM NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_alert_trigger ON routes;
CREATE TRIGGER route_alert_trigger
  AFTER INSERT OR UPDATE OF status ON routes
  FOR EACH ROW EXECUTE FUNCTION notify_route_alert_users();
