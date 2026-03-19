-- Atomic route capacity decrement, guarded against going negative.
-- Returns the number of rows updated (0 if insufficient capacity).
CREATE OR REPLACE FUNCTION decrement_route_capacity(
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
  SET    available_weight_kg = available_weight_kg - p_weight_kg
  WHERE  id                  = p_route_id
    AND  available_weight_kg >= p_weight_kg;

  GET DIAGNOSTICS updated = ROW_COUNT;

  IF updated = 0 THEN
    RAISE EXCEPTION 'Insufficient capacity on route %', p_route_id;
  END IF;

  RETURN updated;
END;
$$;
