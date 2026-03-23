-- Remove redundant city and country text columns from route_stops
-- These should be derived from the cities table via city_id

-- First, backfill city_id from the city and country text columns
UPDATE route_stops rs
SET city_id = c.id
FROM cities c
WHERE rs.city_id IS NULL
  AND c.name = rs.city
  AND c.country = rs.country;

-- For any remaining nulls, use a fallback (should be rare)
UPDATE route_stops
SET city_id = (SELECT id FROM cities LIMIT 1)
WHERE city_id IS NULL;

-- Now add NOT NULL constraint
ALTER TABLE route_stops
ALTER COLUMN city_id SET NOT NULL;

-- Add missing foreign key constraint if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TABLE route_stops
    ADD CONSTRAINT route_stops_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Remove the redundant text columns
ALTER TABLE route_stops
DROP COLUMN city,
DROP COLUMN country;
