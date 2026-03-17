-- ============================================================
-- Wasali Seed Data
-- Run in Supabase dashboard → SQL Editor
-- ============================================================

-- ─── 1. Auth users (required FK for profiles) ───────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'mohamed.karim@wasali.test',   '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'amine.bouazizi@wasali.test',  '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'youssef.trabelsi@wasali.test','$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'karim.hamdi@wasali.test',     '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'sami.riahi@wasali.test',      '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'nabil.mansouri@wasali.test',  '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000',
   'rami.ben-ali@wasali.test',    '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000',
   'khaled.dridi@wasali.test',    '$2a$10$placeholder', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Driver profiles ──────────────────────────────────────
INSERT INTO profiles (id, full_name, phone, phone_verified, created_at, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Mohamed Karim',    '+49 176 1234 5678', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000002', 'Amine Bouazizi',   '+49 176 2345 6789', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000003', 'Youssef Trabelsi', '+33 6 12 34 56 78', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000004', 'Karim Hamdi',      '+49 160 9876 5432', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000005', 'Sami Riahi',       '+49 151 1122 3344', false, now(), now()),
  ('a1000000-0000-0000-0000-000000000006', 'Nabil Mansouri',   '+33 7 98 76 54 32', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000007', 'Rami Ben Ali',     '+49 162 5566 7788', true,  now(), now()),
  ('a1000000-0000-0000-0000-000000000008', 'Khaled Dridi',     '+49 170 3344 5566', true,  now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Routes ───────────────────────────────────────────────
INSERT INTO routes (id, driver_id, origin_city, origin_country, destination_city, destination_country, departure_date, estimated_arrival_date, available_weight_kg, price_per_kg_eur, status, notes)
VALUES
  -- Mohamed Karim: Berlin → Tunis (Mar 25) and Berlin → Sousse (May 10)
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Berlin', 'Germany', 'Tunis', 'Tunisia', '2026-03-25', '2026-03-29', 12.00, 3.50, 'active',
   'No liquids, no weapons, no perishables.'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Berlin', 'Germany', 'Sousse', 'Tunisia', '2026-05-10', '2026-05-14', 20.00, 3.30, 'active',
   'Electronics welcome. Fragile items accepted with proper packaging.'),

  -- Amine Bouazizi: Munich → Tunis (Mar 28) and Munich → Sfax (Apr 20)
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',
   'Munich', 'Germany', 'Tunis', 'Tunisia', '2026-03-28', '2026-04-01', 5.00, 4.00, 'active',
   'No food items or weapons.'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',
   'Munich', 'Germany', 'Sfax', 'Tunisia', '2026-04-20', '2026-04-24', 15.00, 3.80, 'active',
   null),

  -- Youssef Trabelsi: Frankfurt → Sousse (Apr 2) and Paris → Tunis (Apr 15)
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003',
   'Frankfurt', 'Germany', 'Sousse', 'Tunisia', '2026-04-02', '2026-04-06', 22.00, 3.80, 'active',
   'No liquids or fragile items.'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003',
   'Paris', 'France', 'Tunis', 'Tunisia', '2026-04-15', '2026-04-18', 18.00, 4.20, 'active',
   'Documents and small packages preferred.'),

  -- Karim Hamdi: Hamburg → Tunis (Apr 5) and Hamburg → Gabès (May 3)
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004',
   'Hamburg', 'Germany', 'Tunis', 'Tunisia', '2026-04-05', '2026-04-09', 18.00, 3.20, 'active',
   null),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004',
   'Hamburg', 'Germany', 'Gabès', 'Tunisia', '2026-05-03', '2026-05-07', 25.00, 3.40, 'active',
   'Accepting clothing, shoes, and household items.'),

  -- Sami Riahi: Cologne → Gabès (Apr 8)
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000005',
   'Cologne', 'Germany', 'Gabès', 'Tunisia', '2026-04-08', '2026-04-12', 8.00, 4.20, 'active',
   null),

  -- Nabil Mansouri: Frankfurt → Tunis (Apr 12) and Lyon → Tunis (May 20)
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000006',
   'Frankfurt', 'Germany', 'Tunis', 'Tunisia', '2026-04-12', '2026-04-16', 22.00, 3.60, 'active',
   null),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000006',
   'Lyon', 'France', 'Tunis', 'Tunisia', '2026-05-20', '2026-05-23', 10.00, 4.50, 'active',
   'Luxury goods accepted. Declared value required.'),

  -- Rami Ben Ali: Stuttgart → Tunis (Apr 18) and Düsseldorf → Sfax (May 8)
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000007',
   'Stuttgart', 'Germany', 'Tunis', 'Tunisia', '2026-04-18', '2026-04-22', 30.00, 3.10, 'active',
   'Large capacity available. All categories welcome.'),
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000007',
   'Düsseldorf', 'Germany', 'Sfax', 'Tunisia', '2026-05-08', '2026-05-12', 20.00, 3.50, 'active',
   null),

  -- Khaled Dridi: Hannover → Tunis (Apr 25) and Bremen → Sousse (Jun 1)
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000008',
   'Hannover', 'Germany', 'Tunis', 'Tunisia', '2026-04-25', '2026-04-29', 16.00, 3.70, 'active',
   'No perishables. Electronics and clothing preferred.'),
  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000008',
   'Bremen', 'Germany', 'Sousse', 'Tunisia', '2026-06-01', '2026-06-05', 22.00, 3.55, 'active',
   null)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Route stops ──────────────────────────────────────────
INSERT INTO route_stops (id, route_id, city, country, stop_order, arrival_date, is_pickup_available, is_dropoff_available)
VALUES
  -- Route 1: Berlin → Tunis via Hamburg + Sfax
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Hamburg', 'Germany', 1, '2026-03-26', true,  false),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Sfax',    'Tunisia', 2, '2026-03-30', false, true),

  -- Route 2: Berlin → Sousse via Cologne + Monastir
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Cologne',   'Germany', 1, '2026-05-11', true,  false),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Monastir',  'Tunisia', 2, '2026-05-15', false, true),

  -- Route 3: Munich → Tunis via Sousse
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'Sousse', 'Tunisia', 1, '2026-04-02', false, true),

  -- Route 4: Munich → Sfax via Zurich
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000004', 'Zurich', 'Switzerland', 1, '2026-04-21', true, false),

  -- Route 5: Frankfurt → Sousse via Cologne + Sfax
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000005', 'Cologne', 'Germany', 1, '2026-04-03', true,  false),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000005', 'Sfax',    'Tunisia', 2, '2026-04-07', false, true),

  -- Route 6: Paris → Tunis via Lyon
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000006', 'Lyon', 'France', 1, '2026-04-16', true, false),

  -- Route 7: Hamburg → Tunis via Frankfurt + Sfax
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000007', 'Frankfurt', 'Germany', 1, '2026-04-06', true,  false),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000007', 'Sfax',      'Tunisia', 2, '2026-04-10', false, true),

  -- Route 8: Hamburg → Gabès via Sfax
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000008', 'Sfax', 'Tunisia', 1, '2026-05-08', false, true),

  -- Route 10: Frankfurt → Tunis via Sfax
  ('c1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000010', 'Sfax', 'Tunisia', 1, '2026-04-17', false, true),

  -- Route 12: Stuttgart → Tunis via Munich + Sfax
  ('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000012', 'Munich', 'Germany', 1, '2026-04-19', true,  false),
  ('c1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000012', 'Sfax',   'Tunisia', 2, '2026-04-23', false, true),

  -- Route 13: Düsseldorf → Sfax via Cologne
  ('c1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000013', 'Cologne', 'Germany', 1, '2026-05-09', true, false),

  -- Route 14: Hannover → Tunis via Hamburg + Sousse
  ('c1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000014', 'Hamburg', 'Germany', 1, '2026-04-26', true,  false),
  ('c1000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000014', 'Sousse',  'Tunisia', 2, '2026-04-30', false, true),

  -- Route 15: Bremen → Sousse via Hamburg + Sfax
  ('c1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000015', 'Hamburg', 'Germany', 1, '2026-06-02', true,  false),
  ('c1000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000015', 'Sfax',    'Tunisia', 2, '2026-06-06', false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Saved addresses (driver pickup/dropoff addresses) ────
INSERT INTO saved_addresses (id, user_id, label, street, city, country, postal_code, is_default)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Home', 'Torstraße 45', 'Berlin', 'Germany', '10119', true),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Home', 'Maximilianstraße 12', 'Munich', 'Germany', '80539', true),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'Home', 'Kaiserstraße 77', 'Frankfurt', 'Germany', '60329', true),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'Home', 'Reeperbahn 22', 'Hamburg', 'Germany', '20359', true),
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'Home', 'Schildergasse 8', 'Cologne', 'Germany', '50667', true),
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'Home', 'Zeil 100', 'Frankfurt', 'Germany', '60313', true),
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000007', 'Home', 'Königstraße 5', 'Stuttgart', 'Germany', '70173', true),
  ('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008', 'Home', 'Georgstraße 34', 'Hannover', 'Germany', '30159', true)
ON CONFLICT (id) DO NOTHING;
