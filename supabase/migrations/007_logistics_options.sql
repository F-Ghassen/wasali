-- Migration 007: Logistics options
-- Adds driver-configurable collection & delivery options with prices to routes

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS logistics_options jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Example value:
-- [
--   { "type": "collection", "key": "drop_off",    "price_eur": 0  },
--   { "type": "collection", "key": "home_pickup",  "price_eur": 8  },
--   { "type": "delivery",   "key": "recipient_collect", "price_eur": 0  },
--   { "type": "delivery",   "key": "home_delivery",     "price_eur": 10 },
--   { "type": "delivery",   "key": "post_delivery",     "price_eur": 6  }
-- ]
