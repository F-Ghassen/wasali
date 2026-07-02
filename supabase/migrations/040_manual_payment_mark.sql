-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 040: Manual payment tracking
--
-- Adds paid_at timestamp so drivers can record when they received cash or
-- bank-transfer payments for bookings that were not paid via Stripe escrow.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. paid_at: null = not yet paid; non-null = driver recorded payment receipt
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. Driver update policy — allows drivers to set payment_status + paid_at
--    on bookings that belong to their routes.
--    Guard: only creates the policy if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'bookings'
      AND policyname = 'driver_can_mark_paid'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "driver_can_mark_paid" ON bookings
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM routes r
            WHERE r.id = bookings.route_id
              AND r.driver_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM routes r
            WHERE r.id = bookings.route_id
              AND r.driver_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END;
$$;
