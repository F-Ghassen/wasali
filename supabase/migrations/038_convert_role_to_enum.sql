-- Migration: Convert profiles.role and ratings.rater_type to ENUM type
-- Date: 2026-03-24
-- Purpose: Change column type from text to user_role ENUM for proper type safety

-- Drop existing CHECK constraints from previous migration
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_role_valid;

ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS check_rater_type_valid;

-- Drop RLS policies that depend on rater_type column (will be recreated after)
DROP POLICY IF EXISTS "Driver rates sender" ON public.ratings;
DROP POLICY IF EXISTS "Driver updates rating" ON public.ratings;
DROP POLICY IF EXISTS "Sender rates driver" ON public.ratings;
DROP POLICY IF EXISTS "Sender updates rating" ON public.ratings;

-- Drop RLS policies that depend on role column
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create temporary ENUM columns
ALTER TABLE public.profiles
  ADD COLUMN role_temp public.user_role;

ALTER TABLE public.ratings
  ADD COLUMN rater_type_temp public.user_role;

-- Copy data from text columns to ENUM columns
UPDATE public.profiles
  SET role_temp = role::public.user_role
  WHERE role IS NOT NULL;

UPDATE public.ratings
  SET rater_type_temp = rater_type::public.user_role
  WHERE rater_type IS NOT NULL;

-- Drop old text columns
ALTER TABLE public.profiles
  DROP COLUMN role;

ALTER TABLE public.ratings
  DROP COLUMN rater_type;

-- Rename temp columns to original names
ALTER TABLE public.profiles
  RENAME COLUMN role_temp TO role;

ALTER TABLE public.ratings
  RENAME COLUMN rater_type_temp TO rater_type;

-- Set NOT NULL and defaults
ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN role SET DEFAULT 'sender'::public.user_role;

ALTER TABLE public.ratings
  ALTER COLUMN rater_type SET NOT NULL;

-- Recreate RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Recreate RLS policies for ratings
CREATE POLICY "Driver rates sender"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = driver_id
    AND rater_type = 'driver'::public.user_role
  );

CREATE POLICY "Driver updates rating"
  ON public.ratings
  FOR UPDATE
  USING (
    auth.uid() = driver_id
    AND rater_type = 'driver'::public.user_role
  )
  WITH CHECK (
    auth.uid() = driver_id
    AND rater_type = 'driver'::public.user_role
  );

CREATE POLICY "Sender rates driver"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND rater_type = 'sender'::public.user_role
  );

CREATE POLICY "Sender updates rating"
  ON public.ratings
  FOR UPDATE
  USING (
    auth.uid() = sender_id
    AND rater_type = 'sender'::public.user_role
  )
  WITH CHECK (
    auth.uid() = sender_id
    AND rater_type = 'sender'::public.user_role
  );
