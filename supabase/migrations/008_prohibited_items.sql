-- Add prohibited_items column to routes table
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS prohibited_items text[] NOT NULL DEFAULT '{}';
