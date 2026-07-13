-- Phase 1: inverse of decrement_route_capacity (m013).
--
-- When a *confirmed* booking is cancelled, its weight must return to the route's
-- available pool. Today no inverse exists, so capacity leaks. This adds the
-- guarded increment, capped at the route's original total_weight_kg so a
-- double-call can never inflate capacity beyond what the driver offered.

CREATE OR REPLACE FUNCTION increment_route_capacity(
  p_route_id  uuid,
  p_weight_kg numeric
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE routes
  SET    available_weight_kg = LEAST(available_weight_kg + p_weight_kg, total_weight_kg)
  WHERE  id = p_route_id;

  GET DIAGNOSTICS updated = ROW_COUNT;

  IF updated = 0 THEN
    RAISE EXCEPTION 'Route % not found', p_route_id;
  END IF;

  RETURN updated;
END;
$$;
