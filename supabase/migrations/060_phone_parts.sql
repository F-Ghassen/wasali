-- Migration 060: store phone as country code + national number
--
-- profiles.phone and contacts.phone held one free-text string ("+21655000111").
-- This migration adds the two parts as their own columns:
--   phone_country_code  — dial code from the app's country list, e.g. "+216"
--   phone_number        — national number, digits only, no leading trunk zero
--
-- The combined phone column is kept. A BEFORE INSERT/UPDATE trigger derives it
-- from the parts whenever both are set, so readers of `phone` (route cards,
-- driver views, booking snapshots) and the contacts unique key (user_id, phone)
-- keep working. Writers that only set `phone` still work: the trigger leaves
-- those rows alone.
--
-- Backfill splits existing values against the known codes (longest prefix wins).
-- A value with no known code keeps its digits in phone_number and no code, so
-- the app asks for a code the next time the person saves.

-- ─── 1. Helpers ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.phone_country_code_for(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT cc
  FROM unnest(ARRAY['+216', '+44', '+49', '+33', '+39', '+32', '+31', '+34', '+1']) AS cc
  WHERE left(p_phone, char_length(cc)) = cc
  ORDER BY char_length(cc) DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_number(p_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ltrim(regexp_replace(p_number, '[^0-9]', '', 'g'), '0')
$$;

-- ─── 2. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_number text;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_number text;

-- ─── 3. Sync trigger ────────────────────────────────────────────────────────
-- Runs before the backfill so every write goes through the same rule.

CREATE OR REPLACE FUNCTION public.sync_phone_parts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.phone_country_code IS NOT NULL AND NEW.phone_number IS NOT NULL THEN
    NEW.phone_number := public.normalize_phone_number(NEW.phone_number);
    NEW.phone := NEW.phone_country_code || NEW.phone_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_phone_parts ON profiles;
CREATE TRIGGER profiles_sync_phone_parts
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();

DROP TRIGGER IF EXISTS contacts_sync_phone_parts ON contacts;
CREATE TRIGGER contacts_sync_phone_parts
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.sync_phone_parts();

-- ─── 4. Backfill ────────────────────────────────────────────────────────────

-- Normalising can make two contacts of the same person share a phone, which
-- would break the unique key. Stop before writing anything in that case.
DO $$
DECLARE
  v_duplicates integer;
BEGIN
  SELECT count(*) INTO v_duplicates FROM (
    SELECT user_id
    FROM contacts
    WHERE phone IS NOT NULL
    GROUP BY user_id,
             coalesce(public.phone_country_code_for(phone), '') ||
             public.normalize_phone_number(
               substring(phone from char_length(coalesce(public.phone_country_code_for(phone), '')) + 1)
             )
    HAVING count(*) > 1
  ) d;

  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'Migration 060 stopped: % contact phone(s) would collide after normalising', v_duplicates;
  END IF;
END $$;

UPDATE profiles
SET phone_country_code = public.phone_country_code_for(phone),
    phone_number = substring(phone from char_length(public.phone_country_code_for(phone)) + 1)
WHERE phone IS NOT NULL
  AND phone_number IS NULL
  AND public.phone_country_code_for(phone) IS NOT NULL;

UPDATE profiles
SET phone_number = phone
WHERE phone IS NOT NULL
  AND phone_number IS NULL;

UPDATE contacts
SET phone_country_code = public.phone_country_code_for(phone),
    phone_number = substring(phone from char_length(public.phone_country_code_for(phone)) + 1)
WHERE phone IS NOT NULL
  AND phone_number IS NULL
  AND public.phone_country_code_for(phone) IS NOT NULL;

UPDATE contacts
SET phone_number = phone
WHERE phone IS NOT NULL
  AND phone_number IS NULL;
