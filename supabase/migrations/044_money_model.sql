-- Phase 1: money model — service fee (sender-paid) and driver commission
-- (platform cut from driver). Both levers default to 0% at launch, so the
-- numbers are identical to today. See docs/adr/0003.
--
-- total_price      = shipping_eur + service_fee_eur          (what the sender pays)
-- driver_payout_eur = shipping_eur - driver_commission_eur    (what the driver keeps)
--
-- Rates are snapshotted onto each booking so historical bookings stay correct
-- if platform_config later changes.

-- 1. Booking money columns.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS shipping_eur numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_fee_eur numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_commission_eur numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_payout_eur numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_rate_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_commission_rate_pct numeric(5,2) NOT NULL DEFAULT 0;

-- 2. Backfill existing bookings at 0/0 rates:
--    shipping == total_price, no fee, driver keeps the whole amount.
UPDATE bookings
SET shipping_eur       = COALESCE(shipping_eur, total_price, price_eur),
    driver_payout_eur  = COALESCE(NULLIF(driver_payout_eur, 0), total_price, price_eur)
WHERE shipping_eur IS NULL
   OR driver_payout_eur = 0;

-- 3. platform_config: single-row table holding the active rates. Rates live
--    server-side; the client never sets them.
CREATE TABLE IF NOT EXISTS platform_config (
  id                          smallint PRIMARY KEY DEFAULT 1,
  service_fee_rate_pct        numeric(5,2) NOT NULL DEFAULT 0 CHECK (service_fee_rate_pct >= 0 AND service_fee_rate_pct <= 100),
  driver_commission_rate_pct  numeric(5,2) NOT NULL DEFAULT 0 CHECK (driver_commission_rate_pct >= 0 AND driver_commission_rate_pct <= 100),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_config_singleton CHECK (id = 1)
);

INSERT INTO platform_config (id, service_fee_rate_pct, driver_commission_rate_pct)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS: config is world-readable to authenticated users (clients display the
--    fee), writable only by service_role (no write policy = only service_role).
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_config'
      AND policyname = 'platform_config_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "platform_config_read" ON platform_config
        FOR SELECT USING (auth.role() = 'authenticated')
    $policy$;
  END IF;
END;
$$;
