-- Remove redundant text city columns from routes table
-- These are now handled via origin_city_id and destination_city_id foreign keys

ALTER TABLE routes
DROP COLUMN origin_city,
DROP COLUMN destination_city;

-- Update route_templates
ALTER TABLE route_templates
DROP COLUMN origin_city,
DROP COLUMN destination_city;

-- Update route_alerts
ALTER TABLE route_alerts
DROP COLUMN origin_city,
DROP COLUMN destination_city;

-- Update shipping_requests
ALTER TABLE shipping_requests
DROP COLUMN origin_city,
DROP COLUMN destination_city;
