-- Add role column to profiles table to track user type globally
-- Values: 'sender' (default) or 'driver'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'sender' CHECK (role IN ('sender', 'driver'));

-- Index on role for queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
