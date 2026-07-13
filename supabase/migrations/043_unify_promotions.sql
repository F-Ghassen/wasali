-- Phase 0 reconciliation: converge the two route-promo systems onto one.
--
-- Background: two overlapping promo mechanisms exist on `routes`:
--   * m006: promo_discount_pct (1-99) + promo_expires_at + promo_label
--   * m016: promotion_percentage (0-100) + promotion_active
-- The DRIVER WIZARD writes the m006 columns (app/driver/routes/new.tsx), but
-- SEARCH PRICING reads the m016 columns (utils/routeSearch.ts:effectivePrice,
-- computeTotalPrice). Result: a promo set in the wizard never affects the price
-- a sender sees. This migration makes `promotion_percentage`/`promotion_active`
-- the single source of truth for the discount and backfills it from the legacy
-- columns so no existing promo is lost.
--
-- promo_expires_at and promo_label are KEPT as display/expiry metadata.
-- promo_discount_pct is DEPRECATED (code stops writing it; see the accompanying
-- store/wizard change). It is left in place for now and dropped in a later
-- migration once no reads remain, to keep this migration reversible-in-practice.

-- Backfill promotion_percentage from the legacy discount where the canonical
-- column is empty but a legacy promo exists.
UPDATE routes
SET promotion_percentage = promo_discount_pct
WHERE promotion_percentage IS NULL
  AND promo_discount_pct IS NOT NULL;

-- Activate the canonical flag for any route that has a live legacy promo
-- (no expiry, or expiry still in the future) and isn't already active.
UPDATE routes
SET promotion_active = true
WHERE promotion_active = false
  AND promo_discount_pct IS NOT NULL
  AND (promo_expires_at IS NULL OR promo_expires_at >= CURRENT_DATE);
