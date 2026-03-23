-- Remove redundant country columns - derive from cities table instead

ALTER TABLE routes
DROP COLUMN IF EXISTS origin_country,
DROP COLUMN IF EXISTS destination_country;

ALTER TABLE route_templates
DROP COLUMN IF EXISTS origin_country,
DROP COLUMN IF EXISTS destination_country;

ALTER TABLE shipping_requests
DROP COLUMN IF EXISTS origin_country,
DROP COLUMN IF EXISTS destination_country;
