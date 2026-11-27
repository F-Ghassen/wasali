-- Migration 061: consent, locale and segmentation fields on profiles
--
-- Supports the user data plan (docs/plans/user-data-and-analytics.md):
--   consent     — opt-in timestamps for analytics and marketing, plus the terms
--                 version accepted. Null consent = not consented.
--   profile     — residence country, preferred locale, sign-up source, last activity.
--
-- Existing users start opted out (consent columns stay null). Terms acceptance
-- is backfilled from created_at with the placeholder version 'v1'; set the real
-- version before pushing if it differs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS analytics_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS preferred_locale text,
  ADD COLUMN IF NOT EXISTS acquisition_source text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

UPDATE profiles
SET terms_version = 'v1',
    terms_accepted_at = created_at
WHERE terms_accepted_at IS NULL;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_preferred_locale_check
  CHECK (preferred_locale IS NULL OR preferred_locale IN ('en', 'fr', 'ar', 'darija'));
