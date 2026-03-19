-- ─── 1. Cities table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  country      text        NOT NULL,
  country_code char(2)     NOT NULL,
  flag_emoji   text        NOT NULL DEFAULT '',
  is_active    boolean     NOT NULL DEFAULT true,
  coming_soon  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cities_name_country_key UNIQUE (name, country)
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_public_read" ON cities FOR SELECT USING (true);

-- ─── 2. Seed all 29 cities ──────────────────────────────────────────────────
INSERT INTO cities (name, country, country_code, flag_emoji) VALUES
  -- EU origins
  ('Paris',       'France',          'FR', '🇫🇷'),
  ('Lyon',        'France',          'FR', '🇫🇷'),
  ('Marseille',   'France',          'FR', '🇫🇷'),
  ('Toulouse',    'France',          'FR', '🇫🇷'),
  ('Nice',        'France',          'FR', '🇫🇷'),
  ('Berlin',      'Germany',         'DE', '🇩🇪'),
  ('Munich',      'Germany',         'DE', '🇩🇪'),
  ('Frankfurt',   'Germany',         'DE', '🇩🇪'),
  ('Hamburg',     'Germany',         'DE', '🇩🇪'),
  ('Cologne',     'Germany',         'DE', '🇩🇪'),
  ('Milan',       'Italy',           'IT', '🇮🇹'),
  ('Rome',        'Italy',           'IT', '🇮🇹'),
  ('Madrid',      'Spain',           'ES', '🇪🇸'),
  ('Barcelona',   'Spain',           'ES', '🇪🇸'),
  ('Brussels',    'Belgium',         'BE', '🇧🇪'),
  ('Amsterdam',   'Netherlands',     'NL', '🇳🇱'),
  ('London',      'United Kingdom',  'GB', '🇬🇧'),
  ('Zurich',      'Switzerland',     'CH', '🇨🇭'),
  ('Stockholm',   'Sweden',          'SE', '🇸🇪'),
  -- TN destinations
  ('Tunis',       'Tunisia',         'TN', '🇹🇳'),
  ('Sfax',        'Tunisia',         'TN', '🇹🇳'),
  ('Sousse',      'Tunisia',         'TN', '🇹🇳'),
  ('Gabes',       'Tunisia',         'TN', '🇹🇳'),
  ('Bizerte',     'Tunisia',         'TN', '🇹🇳'),
  ('Kairouan',    'Tunisia',         'TN', '🇹🇳'),
  ('Monastir',    'Tunisia',         'TN', '🇹🇳'),
  ('Nabeul',      'Tunisia',         'TN', '🇹🇳'),
  ('Hammamet',    'Tunisia',         'TN', '🇹🇳'),
  ('Gafsa',       'Tunisia',         'TN', '🇹🇳')
ON CONFLICT (name, country) DO NOTHING;

-- ─── 3. Promotion columns on routes ─────────────────────────────────────────
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS promotion_percentage float
    CHECK (promotion_percentage IS NULL OR (promotion_percentage > 0 AND promotion_percentage <= 100)),
  ADD COLUMN IF NOT EXISTS promotion_active boolean NOT NULL DEFAULT false;

-- ─── 4. Driver stats columns on profiles ────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rating          float   NOT NULL DEFAULT 0
    CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS completed_trips integer NOT NULL DEFAULT 0;
