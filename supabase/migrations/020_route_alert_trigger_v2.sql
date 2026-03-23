-- Migration 020: Update route_alert trigger to match on city_id when available,
--               fall back to text match for rows not yet backfilled.
-- This migration MUST run after migration 019 (which adds origin_city_id,
-- destination_city_id columns to the routes table).

CREATE OR REPLACE FUNCTION notify_route_alert_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  origin_city_name text;
  destination_city_name text;
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    -- Look up city names from cities table
    SELECT name INTO origin_city_name FROM cities WHERE id = NEW.origin_city_id LIMIT 1;
    SELECT name INTO destination_city_name FROM cities WHERE id = NEW.destination_city_id LIMIT 1;

    -- Use city IDs as fallback if lookups fail
    origin_city_name := COALESCE(origin_city_name, NEW.origin_city_id::text);
    destination_city_name := COALESCE(destination_city_name, NEW.destination_city_id::text);

    INSERT INTO notifications (user_id, type, message)
    SELECT
      ra.user_id,
      'route_alert',
      'A new route from ' || origin_city_name || ' to ' || destination_city_name
        || ' is available on ' || to_char(NEW.departure_date::date, 'Mon DD, YYYY') || '.'
    FROM route_alerts ra
    WHERE
      -- Match on city_id only (no more text fallback)
      ra.origin_city_id = NEW.origin_city_id
      AND ra.destination_city_id = NEW.destination_city_id
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
