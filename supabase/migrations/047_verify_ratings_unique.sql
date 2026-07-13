-- Phase 0 reconciliation: correct the ratings uniqueness constraint.
--
-- Background: ratings are bidirectional — one row where rater_type='sender'
-- (sender rating the driver) and one where rater_type='driver' (driver rating
-- the sender), for the SAME booking. Both rows carry the SAME sender_id and
-- driver_id (the two parties don't change), differing only in rater_type.
--
-- Migration 031 set UNIQUE(booking_id, sender_id, driver_id). That is incorrect:
-- both rating rows have identical (booking_id, sender_id, driver_id), so the
-- constraint rejects the second party's rating and makes bidirectional ratings
-- impossible. The correct discriminator is rater_type.
--
-- Canonical: UNIQUE(booking_id, rater_type) — at most one sender-rating and one
-- driver-rating per booking. This matches supabase/schema.sql line 128.

-- Drop the incorrect composite constraint from m031 (and the legacy single-column
-- one, in case a divergent apply path left it).
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_unique_rater;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_booking_id_key;

-- Assert the canonical constraint (guard against re-runs).
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_booking_rater_type_key;
ALTER TABLE ratings
  ADD CONSTRAINT ratings_booking_rater_type_key UNIQUE (booking_id, rater_type);
