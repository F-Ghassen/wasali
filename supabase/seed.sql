-- ─── Seed: auth users → profiles → routes → stops ─────────────────────────
-- Run this in the Supabase dashboard → SQL Editor

-- 1. Insert into auth.users (required because profiles.id FK → auth.users.id)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000000',
   'driver1@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000002', '00000000-0000-0000-0000-000000000000',
   'driver2@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000003', '00000000-0000-0000-0000-000000000000',
   'driver3@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000004', '00000000-0000-0000-0000-000000000000',
   'driver4@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000005', '00000000-0000-0000-0000-000000000000',
   'driver5@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000006', '00000000-0000-0000-0000-000000000000',
   'driver6@wasali.test', '$2a$10$placeholder',
   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Driver profiles
INSERT INTO profiles (id, full_name, phone, phone_verified)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Mohamed Karim',   '+49 176 1234 5678', true),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'Amine Bouazizi',   '+49 176 2345 6789', true),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'Youssef Trabelsi', '+33 6 12 34 56 78', true),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'Karim Hamdi',      '+49 160 9876 5432', true),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'Sami Riahi',       '+49 151 1122 3344', false),
  ('a1b2c3d4-0001-0001-0001-000000000006', 'Nabil Mansouri',   '+33 7 98 76 54 32', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Routes
INSERT INTO routes (id, driver_id, origin_city, origin_country, destination_city, destination_country, departure_date, estimated_arrival_date, available_weight_kg, price_per_kg_eur, status, notes)
VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001',
   'Berlin', 'Germany', 'Tunis', 'Tunisia', '2026-03-25', '2026-03-29',
   12.00, 3.50, 'active', 'No liquids, no weapons, no perishables.'),
  ('b2c3d4e5-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000002',
   'Munich', 'Germany', 'Tunis', 'Tunisia', '2026-03-28', '2026-04-01',
   5.00, 4.00, 'active', 'No food items or weapons.'),
  ('b2c3d4e5-0001-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000003',
   'Frankfurt', 'Germany', 'Sousse', 'Tunisia', '2026-04-02', '2026-04-06',
   22.00, 3.80, 'active', 'No liquids or fragile items.'),
  ('b2c3d4e5-0001-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000004',
   'Hamburg', 'Germany', 'Tunis', 'Tunisia', '2026-04-05', '2026-04-09',
   18.00, 3.20, 'active', null),
  ('b2c3d4e5-0001-0001-0001-000000000005', 'a1b2c3d4-0001-0001-0001-000000000005',
   'Cologne', 'Germany', 'Gabès', 'Tunisia', '2026-04-08', '2026-04-12',
   8.00, 4.20, 'active', null),
  ('b2c3d4e5-0001-0001-0001-000000000006', 'a1b2c3d4-0001-0001-0001-000000000006',
   'Frankfurt', 'Germany', 'Tunis', 'Tunisia', '2026-04-12', '2026-04-16',
   22.00, 3.60, 'active', null)
ON CONFLICT (id) DO NOTHING;

-- 4. Route stops
INSERT INTO route_stops (id, route_id, city, country, stop_order, arrival_date, is_pickup_available, is_dropoff_available)
VALUES
  ('c3d4e5f6-0001-0001-0001-000000000001', 'b2c3d4e5-0001-0001-0001-000000000001', 'Hamburg', 'Germany', 1, '2026-03-26', true,  false),
  ('c3d4e5f6-0001-0001-0001-000000000002', 'b2c3d4e5-0001-0001-0001-000000000001', 'Sfax',    'Tunisia', 2, '2026-03-30', false, true),
  ('c3d4e5f6-0001-0001-0001-000000000003', 'b2c3d4e5-0001-0001-0001-000000000002', 'Sousse',  'Tunisia', 1, '2026-04-02', false, true),
  ('c3d4e5f6-0001-0001-0001-000000000004', 'b2c3d4e5-0001-0001-0001-000000000003', 'Cologne', 'Germany', 1, '2026-04-03', true,  false),
  ('c3d4e5f6-0001-0001-0001-000000000005', 'b2c3d4e5-0001-0001-0001-000000000003', 'Sfax',    'Tunisia', 2, '2026-04-07', false, true),
  ('c3d4e5f6-0001-0001-0001-000000000006', 'b2c3d4e5-0001-0001-0001-000000000006', 'Sfax',    'Tunisia', 1, '2026-04-17', false, true)
ON CONFLICT (id) DO NOTHING;
