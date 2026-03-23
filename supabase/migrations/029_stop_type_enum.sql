-- Migration 029: Convert route_stops.stop_type from text to enum

CREATE TYPE stop_type_enum AS ENUM ('collection', 'dropoff');

-- Drop the existing check constraint before altering the column type
ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS route_stops_stop_type_check;

ALTER TABLE route_stops
  ALTER COLUMN stop_type DROP DEFAULT,
  ALTER COLUMN stop_type TYPE stop_type_enum
    USING stop_type::stop_type_enum,
  ALTER COLUMN stop_type SET DEFAULT 'collection'::stop_type_enum;
