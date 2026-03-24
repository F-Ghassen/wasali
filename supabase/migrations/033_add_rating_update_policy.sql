-- Add RLS policy to allow users to update their own ratings
-- Supports both sender and driver updating their respective ratings

DROP POLICY IF EXISTS "Sender can insert own ratings" ON ratings;

-- Allow users who are either the sender or driver to insert ratings
CREATE POLICY "Users can insert own ratings" ON ratings
FOR INSERT WITH CHECK (auth.uid() = sender_id OR auth.uid() = driver_id);

-- Allow users to update ratings they created (sender or driver)
CREATE POLICY "Users can update own ratings" ON ratings
FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = driver_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = driver_id);
