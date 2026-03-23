-- Migration 020: Update route_alert trigger to match on city_id when available,
--               fall back to text match for rows not yet backfilled.
-- Updated to extract city IDs from route_stops (single source of truth).

CREATE OR REPLACE FUNCTION notify_route_alert_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_origin_city_id uuid;
  v_destination_city_id uuid;
  v_origin_city_name text;
  v_destination_city_name text;
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    -- Extract origin and destination city IDs from route_stops
    SELECT route_stops.city_id INTO v_origin_city_id
    FROM route_stops
    WHERE route_stops.route_id = NEW.id AND route_stops.stop_type = 'collection'
    LIMIT 1;

    SELECT route_stops.city_id INTO v_destination_city_id
    FROM route_stops
    WHERE route_stops.route_id = NEW.id AND route_stops.stop_type = 'dropoff'
    LIMIT 1;

    -- Look up city names from cities table
    SELECT name INTO v_origin_city_name FROM cities WHERE id = v_origin_city_id LIMIT 1;
    SELECT name INTO v_destination_city_name FROM cities WHERE id = v_destination_city_id LIMIT 1;

    -- Use city IDs as fallback if lookups fail
    v_origin_city_name := COALESCE(v_origin_city_name, v_origin_city_id::text, 'Unknown');
    v_destination_city_name := COALESCE(v_destination_city_name, v_destination_city_id::text, 'Unknown');

    -- Only send notifications if we found both cities
    IF v_origin_city_id IS NOT NULL AND v_destination_city_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, message)
      SELECT
        ra.user_id,
        'route_alert',
        'A new route from ' || v_origin_city_name || ' to ' || v_destination_city_name
          || ' is available on ' || to_char(NEW.departure_date::date, 'Mon DD, YYYY') || '.'
      FROM route_alerts ra
      WHERE
        -- Match on city_id
        ra.origin_city_id = v_origin_city_id
        AND ra.destination_city_id = v_destination_city_id
        AND (ra.date_from IS NULL OR ra.date_from <= NEW.departure_date::date)
        AND ra.user_id IS DISTINCT FROM NEW.driver_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_alert_trigger ON routes;
CREATE TRIGGER route_alert_trigger
  AFTER INSERT OR UPDATE OF status ON routes
  FOR EACH ROW EXECUTE FUNCTION notify_route_alert_users();
