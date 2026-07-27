-- Migration 056: Support guest route alerts via email.
--
-- route_alerts.user_id has been NOT NULL since it was created, and no email
-- column ever existed, so the guest-alert UI (RouteAlertModal / RouteAlertSheet)
-- has never been able to actually save an alert for a signed-out user.
-- This makes user_id nullable and adds an email column, requiring exactly
-- one of the two to be present.

ALTER TABLE route_alerts
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE route_alerts
  ADD CONSTRAINT route_alerts_user_or_email_chk
  CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Replace the owner-only policy so guests can create an email-only alert,
-- while signed-in users keep full access to their own rows.
DROP POLICY IF EXISTS "route_alerts_user_all" ON route_alerts;

CREATE POLICY "route_alerts_owner_all"
  ON route_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "route_alerts_guest_insert"
  ON route_alerts FOR INSERT
  WITH CHECK (user_id IS NULL AND email IS NOT NULL);

-- The notify trigger inserts into notifications(user_id ...), which itself
-- requires a NOT NULL user_id. Guest (email-only) alerts have no in-app
-- notification target, so skip them here — they're intended to be reached
-- by the notify-route-alert edge function's email step instead.
CREATE OR REPLACE FUNCTION notify_route_alert_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_origin_city_id uuid;
  v_destination_city_id uuid;
  v_origin_city_name text;
  v_destination_city_name text;
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT route_stops.city_id INTO v_origin_city_id
    FROM route_stops
    WHERE route_stops.route_id = NEW.id AND route_stops.stop_type = 'collection'
    LIMIT 1;

    SELECT route_stops.city_id INTO v_destination_city_id
    FROM route_stops
    WHERE route_stops.route_id = NEW.id AND route_stops.stop_type = 'dropoff'
    LIMIT 1;

    SELECT name INTO v_origin_city_name FROM cities WHERE id = v_origin_city_id LIMIT 1;
    SELECT name INTO v_destination_city_name FROM cities WHERE id = v_destination_city_id LIMIT 1;

    v_origin_city_name := COALESCE(v_origin_city_name, v_origin_city_id::text, 'Unknown');
    v_destination_city_name := COALESCE(v_destination_city_name, v_destination_city_id::text, 'Unknown');

    IF v_origin_city_id IS NOT NULL AND v_destination_city_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, message)
      SELECT
        ra.user_id,
        'route_alert',
        'A new route from ' || v_origin_city_name || ' to ' || v_destination_city_name
          || ' is available on ' || to_char(NEW.departure_date::date, 'Mon DD, YYYY') || '.'
      FROM route_alerts ra
      WHERE
        ra.user_id IS NOT NULL
        AND ra.origin_city_id = v_origin_city_id
        AND ra.destination_city_id = v_destination_city_id
        AND (ra.date_from IS NULL OR ra.date_from <= NEW.departure_date::date)
        AND ra.user_id IS DISTINCT FROM NEW.driver_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
