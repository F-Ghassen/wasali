-- Restrict ratings so users can only rate their counterparty, not themselves
-- Driver can only rate the sender, sender can only rate the driver

DROP POLICY IF EXISTS "Users can insert own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON ratings;

-- Allow driver to insert/update ratings for senders (driver_id = auth.uid() and driver_id != sender_id)
CREATE POLICY "Driver can rate sender" ON ratings
FOR INSERT WITH CHECK (
  auth.uid() = driver_id AND
  driver_id != sender_id
);

-- Allow sender to insert/update ratings for drivers (sender_id = auth.uid() and sender_id != driver_id)
CREATE POLICY "Sender can rate driver" ON ratings
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  sender_id != driver_id
);

-- Allow driver to update their rating of sender
CREATE POLICY "Driver can update rating of sender" ON ratings
FOR UPDATE USING (
  auth.uid() = driver_id AND
  driver_id != sender_id
) WITH CHECK (
  auth.uid() = driver_id AND
  driver_id != sender_id
);

-- Allow sender to update their rating of driver
CREATE POLICY "Sender can update rating of driver" ON ratings
FOR UPDATE USING (
  auth.uid() = sender_id AND
  sender_id != driver_id
) WITH CHECK (
  auth.uid() = sender_id AND
  sender_id != driver_id
);
