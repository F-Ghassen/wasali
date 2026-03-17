-- ============================================================
-- Wasali Driver Seed Fix
-- Run AFTER seed.sql in Supabase dashboard → SQL Editor
--
-- What this does:
--   1. Sets role = 'driver' on the 8 existing seeded profiles
--   2. Gives those auth users a real password so you can log in
--   3. Creates 2 extra "primary test" driver accounts with
--      easy-to-remember credentials for manual QA
--
-- Test credentials (all accounts):
--   Password for existing 8 drivers:  TestDriver1!
--   Primary test driver 1:  driver1@wasali.test  / TestDriver1!
--   Primary test driver 2:  driver2@wasali.test  / TestDriver2!
-- ============================================================

-- ─── 1. Fix role on the 8 existing seeded profiles ──────────
UPDATE profiles
SET role = 'driver', updated_at = now()
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000008'
);

-- ─── 2. Give the 8 existing auth users a real password ──────
-- Password: TestDriver1!
UPDATE auth.users
SET
  encrypted_password = extensions.crypt('TestDriver1!', extensions.gen_salt('bf', 10)),
  updated_at = now()
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000008'
);

-- ─── 3. Primary test driver accounts (easy QA credentials) ──

-- Auth users
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'driver1@wasali.test',
    extensions.crypt('TestDriver1!', extensions.gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email"}',
    '{"full_name":"Ali Test Driver","role":"driver"}',
    'authenticated', 'authenticated'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'driver2@wasali.test',
    extensions.crypt('TestDriver2!', extensions.gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email"}',
    '{"full_name":"Sara Test Driver","role":"driver"}',
    'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO profiles (id, full_name, phone, phone_verified, role, created_at, updated_at)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'Ali Test Driver',
    '+216 20 000 001',
    true,
    'driver',
    now(), now()
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'Sara Test Driver',
    '+216 20 000 002',
    true,
    'driver',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Routes for test drivers
INSERT INTO routes (
  id, driver_id,
  origin_city, origin_country,
  destination_city, destination_country,
  departure_date, estimated_arrival_date,
  available_weight_kg, price_per_kg_eur,
  status, notes
)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'Berlin', 'Germany', 'Tunis', 'Tunisia',
    '2026-04-01', '2026-04-05',
    20.00, 3.50,
    'active', 'Test driver route — all categories welcome.'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    'Paris', 'France', 'Tunis', 'Tunisia',
    '2026-04-10', '2026-04-13',
    15.00, 4.00,
    'active', 'Test driver route — documents and small parcels.'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Summary ────────────────────────────────────────────────
-- Existing 8 drivers (from seed.sql):
--   mohamed.karim@wasali.test   → TestDriver1!
--   amine.bouazizi@wasali.test  → TestDriver1!
--   youssef.trabelsi@wasali.test→ TestDriver1!
--   karim.hamdi@wasali.test     → TestDriver1!
--   sami.riahi@wasali.test      → TestDriver1!
--   nabil.mansouri@wasali.test  → TestDriver1!
--   rami.ben-ali@wasali.test    → TestDriver1!
--   khaled.dridi@wasali.test    → TestDriver1!
--
-- Primary QA accounts (new):
--   driver1@wasali.test  → TestDriver1!
--   driver2@wasali.test  → TestDriver2!
