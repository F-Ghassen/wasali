-- Migration 050: Fix handle_new_user() role cast
--
-- Bug: 038_convert_role_to_enum.sql converted profiles.role from `text` to
-- the `public.user_role` ENUM, but never updated handle_new_user() (last
-- touched in 005_driver_role.sql), which still inserts a plain text value.
-- Postgres rejects a text literal into an enum column without an explicit
-- cast, so every signup since 038 landed has failed with
-- "Database error creating new user" (auth.users insert succeeds, the
-- AFTER INSERT trigger fails, and Supabase surfaces a 500).
--
-- Fix: cast the COALESCE result to public.user_role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'sender')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
