-- Migration 021: Add is_capital flag to cities table and mark capitals

-- Add is_capital column to cities table
ALTER TABLE cities ADD COLUMN is_capital boolean NOT NULL DEFAULT false;

-- Mark known capital cities
UPDATE cities SET is_capital = true WHERE (name, country) IN (
  ('Paris', 'France'),
  ('Berlin', 'Germany'),
  ('Rome', 'Italy'),
  ('Madrid', 'Spain'),
  ('Warsaw', 'Poland'),
  ('Amsterdam', 'Netherlands'),
  ('Brussels', 'Belgium'),
  ('Vienna', 'Austria'),
  ('Stockholm', 'Sweden'),
  ('Copenhagen', 'Denmark'),
  ('Helsinki', 'Finland'),
  ('Dublin', 'Ireland'),
  ('Lisbon', 'Portugal'),
  ('Athens', 'Greece'),
  ('Prague', 'Czech Republic'),
  ('Bucharest', 'Romania'),
  ('Budapest', 'Hungary'),
  ('Tunis', 'Tunisia')
);

-- Create index for faster lookups
CREATE INDEX idx_cities_is_capital ON cities(is_capital) WHERE is_capital = true;
