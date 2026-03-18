-- Add minimum weight per booking to routes table
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS min_weight_kg numeric NOT NULL DEFAULT 10;
