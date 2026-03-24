-- Migration: Create user_role ENUM type for type safety
-- Date: 2026-03-24
-- Purpose: Define ENUM for user roles; columns remain text but checked against ENUM values

-- Create the ENUM type for user roles
CREATE TYPE public.user_role AS ENUM ('sender', 'driver');

-- Add CHECK constraint to profiles.role to enforce ENUM values
ALTER TABLE public.profiles
  ADD CONSTRAINT check_role_valid CHECK (role::text = ANY (ARRAY['sender', 'driver']));

-- Add CHECK constraint to ratings.rater_type to enforce ENUM values
ALTER TABLE public.ratings
  ADD CONSTRAINT check_rater_type_valid CHECK (rater_type::text = ANY (ARRAY['sender', 'driver']));
