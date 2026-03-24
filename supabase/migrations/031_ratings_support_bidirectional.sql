-- Fix ratings table to support bidirectional ratings (driver→sender and sender→driver)
-- Replace UNIQUE(booking_id) with UNIQUE(booking_id, sender_id, driver_id)

-- Create function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old unique constraint
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_booking_id_key;

-- Add updated_at column if it doesn't exist
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add new composite unique constraint
ALTER TABLE ratings ADD CONSTRAINT ratings_unique_rater UNIQUE (booking_id, sender_id, driver_id);

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
