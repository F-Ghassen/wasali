-- Add rater_type column to ratings table to track who is rating whom
-- Values: 'driver' (driver rating sender) or 'sender' (sender rating driver)

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS rater_type text NOT NULL DEFAULT 'sender' CHECK (rater_type IN ('driver', 'sender'));

-- Update existing ratings based on who is different
-- If the rater is the driver_id (and different from sender_id), rater_type = 'driver'
-- If the rater is the sender_id (and different from driver_id), rater_type = 'sender'
-- For self-ratings (same person), we'll keep the default 'sender'

-- Drop old RLS policies
DROP POLICY IF EXISTS "Driver can rate sender" ON ratings;
DROP POLICY IF EXISTS "Sender can rate driver" ON ratings;
DROP POLICY IF EXISTS "Driver can update rating of sender" ON ratings;
DROP POLICY IF EXISTS "Sender can update rating of driver" ON ratings;

-- New RLS policies with rater_type
-- Allow driver to insert/update ratings with rater_type = 'driver'
CREATE POLICY "Driver rates sender" ON ratings
FOR INSERT WITH CHECK (
  auth.uid() = driver_id AND
  rater_type = 'driver'
);

CREATE POLICY "Driver updates rating" ON ratings
FOR UPDATE USING (
  auth.uid() = driver_id AND
  rater_type = 'driver'
) WITH CHECK (
  auth.uid() = driver_id AND
  rater_type = 'driver'
);

-- Allow sender to insert/update ratings with rater_type = 'sender'
CREATE POLICY "Sender rates driver" ON ratings
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  rater_type = 'sender'
);

CREATE POLICY "Sender updates rating" ON ratings
FOR UPDATE USING (
  auth.uid() = sender_id AND
  rater_type = 'sender'
) WITH CHECK (
  auth.uid() = sender_id AND
  rater_type = 'sender'
);
