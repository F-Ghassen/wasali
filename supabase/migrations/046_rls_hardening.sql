-- Phase 1: enforce legal state transitions and tighten booking write access.
--
-- Until now, status transitions were app-only (unguarded UPDATEs) and the driver
-- booking UPDATE policy (m005) was column-blind, so a driver could edit any
-- column (price, addresses) on a booking on their route. This migration:
--   1. Adds enforce_booking_transition() / enforce_route_transition() triggers
--      that reject illegal status jumps at the DB level.
--   2. Adds a sender confirmed -> cancelled policy (pre-in_transit self-cancel).
--   3. Enforces cash-only markPaid at the DB level.
--
-- The legal-transition maps mirror constants/bookingStatus.ts (LEGAL_TRANSITIONS)
-- and docs/blueprint/trips-and-bookings.md §2.

-- ─── Booking transition guard ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_booking_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only police status changes.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending'    AND NEW.status IN ('confirmed','cancelled')) OR
      (OLD.status = 'confirmed'  AND NEW.status IN ('in_transit','cancelled','disputed')) OR
      (OLD.status = 'in_transit' AND NEW.status IN ('delivered','disputed')) OR
      (OLD.status = 'delivered'  AND NEW.status IN ('disputed'))
    ) THEN
      RAISE EXCEPTION 'Illegal booking status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- Cash-only mark-paid: payment_status may only move to 'paid' for cash types.
  IF NEW.payment_status = 'paid'
     AND OLD.payment_status IS DISTINCT FROM 'paid'
     AND NEW.payment_type NOT IN ('cash_on_collection','cash_on_delivery') THEN
    RAISE EXCEPTION 'Only cash bookings can be marked paid manually (got payment_type=%)', NEW.payment_type;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_transition ON bookings;
CREATE TRIGGER trg_enforce_booking_transition
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_transition();

-- ─── Route transition guard ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_route_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft'  AND NEW.status IN ('active','cancelled')) OR
      (OLD.status = 'active' AND NEW.status IN ('full','completed','cancelled')) OR
      (OLD.status = 'full'   AND NEW.status IN ('active','completed','cancelled'))
    ) THEN
      RAISE EXCEPTION 'Illegal route status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_route_transition ON routes;
CREATE TRIGGER trg_enforce_route_transition
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_route_transition();

-- ─── Sender confirmed -> cancelled ───────────────────────────────────────────
-- m039 allows sender pending -> cancelled. Allow confirmed -> cancelled too
-- (pre-in_transit self-cancel; capacity is restored by the app via
-- increment_route_capacity). in_transit and later are NOT self-cancellable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
      AND policyname = 'Sender can cancel own confirmed bookings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Sender can cancel own confirmed bookings" ON bookings
        FOR UPDATE
        USING (sender_id = auth.uid() AND status = 'confirmed')
        WITH CHECK (status = 'cancelled')
    $policy$;
  END IF;
END;
$$;
