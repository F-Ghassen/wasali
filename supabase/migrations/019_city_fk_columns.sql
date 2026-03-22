-- Migration 019: Add city_id FK columns to routes, shipping_requests,
--               route_alerts, and route_templates.
-- Strategy: nullable FKs first → backfill by name match → optionally tighten later.
-- Text columns are KEPT for display, search indexing, and backwards compat.

-- ─── 1. routes ────────────────────────────────────────────────────────────────
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS origin_city_id      uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

-- Backfill via exact name + country match
UPDATE routes r
SET origin_city_id = c.id
FROM cities c
WHERE c.name = r.origin_city
  AND c.country = r.origin_country
  AND r.origin_city_id IS NULL;

UPDATE routes r
SET destination_city_id = c.id
FROM cities c
WHERE c.name = r.destination_city
  AND c.country = r.destination_country
  AND r.destination_city_id IS NULL;

CREATE INDEX IF NOT EXISTS routes_origin_city_id_idx      ON routes (origin_city_id);
CREATE INDEX IF NOT EXISTS routes_destination_city_id_idx ON routes (destination_city_id);

-- ─── 2. shipping_requests ─────────────────────────────────────────────────────
ALTER TABLE shipping_requests
  ADD COLUMN IF NOT EXISTS origin_city_id      uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

UPDATE shipping_requests sr
SET origin_city_id = c.id
FROM cities c
WHERE c.name = sr.origin_city
  AND c.country = sr.origin_country
  AND sr.origin_city_id IS NULL;

UPDATE shipping_requests sr
SET destination_city_id = c.id
FROM cities c
WHERE c.name = sr.destination_city
  AND c.country = sr.destination_country
  AND sr.destination_city_id IS NULL;

-- ─── 3. route_alerts ──────────────────────────────────────────────────────────
-- The trigger in 017 matches on ra.origin_city = NEW.origin_city (text).
-- Adding FK columns here is purely for future use and display.
-- The TRIGGER IS NOT MODIFIED in this migration — see migration 020 for the
-- trigger update that switches it to join on city_id.
ALTER TABLE route_alerts
  ADD COLUMN IF NOT EXISTS origin_city_id      uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

UPDATE route_alerts ra
SET origin_city_id = c.id
FROM cities c
WHERE c.name = ra.origin_city
  AND ra.origin_city_id IS NULL;

UPDATE route_alerts ra
SET destination_city_id = c.id
FROM cities c
WHERE c.name = ra.destination_city
  AND ra.destination_city_id IS NULL;

-- ─── 4. route_templates ───────────────────────────────────────────────────────
ALTER TABLE route_templates
  ADD COLUMN IF NOT EXISTS origin_city_id      uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_city_id uuid REFERENCES cities(id) ON DELETE SET NULL;

UPDATE route_templates rt
SET origin_city_id = c.id
FROM cities c
WHERE c.name = rt.origin_city
  AND c.country = rt.origin_country
  AND rt.origin_city_id IS NULL;

UPDATE route_templates rt
SET destination_city_id = c.id
FROM cities c
WHERE c.name = rt.destination_city
  AND c.country = rt.destination_country
  AND rt.destination_city_id IS NULL;
