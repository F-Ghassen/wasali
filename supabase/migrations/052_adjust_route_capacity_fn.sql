-- Migration 052: Signed-delta wrapper over decrement/increment_route_capacity.
--
-- Driver-side mid-pickup weight adjustment (adjustPackageWeight in
-- stores/driverBookingStore.ts) needs to move route capacity by
-- (old_weight - new_weight), which can be positive or negative depending on
-- whether the corrected weight is lower or higher than what was booked.
-- Rather than duplicate the guarded logic in decrement_route_capacity (m013)
-- / increment_route_capacity (m045), this dispatches to whichever applies.
--
-- On a weight increase (delta < 0, i.e. more capacity is being consumed),
-- this surfaces decrement_route_capacity's existing
-- 'Insufficient capacity on route %' exception unchanged — callers must
-- catch it and abort the weight adjustment before writing to bookings.

CREATE OR REPLACE FUNCTION adjust_route_capacity(
  p_route_id  uuid,
  p_delta_kg  numeric
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_delta_kg > 0 THEN
    PERFORM increment_route_capacity(p_route_id, p_delta_kg);
  ELSIF p_delta_kg < 0 THEN
    PERFORM decrement_route_capacity(p_route_id, abs(p_delta_kg));
  END IF;
  -- p_delta_kg = 0: no-op, weight unchanged.
END;
$$;
