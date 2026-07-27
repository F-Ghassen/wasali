-- Migration 051: Allow 'bank_transfer' in route_payment_methods.
--
-- route_payment_methods (migration 014) only allowed
-- cash_on_collection | cash_on_delivery | credit_debit_card | paypal —
-- 'bank_transfer' couldn't be modeled per-route even though the older
-- routes.payment_methods text[] column (migration 006) already defaults to
-- including it. constants/paymentMethods.ts now treats bank_transfer as a
-- platform-"coming soon" catalogue entry alongside card/paypal; this
-- migration lets a route row actually store it (still gated off at the
-- platform level in the client until the feature ships).

ALTER TABLE route_payment_methods
  DROP CONSTRAINT IF EXISTS route_payment_methods_payment_type_check;

ALTER TABLE route_payment_methods
  ADD CONSTRAINT route_payment_methods_payment_type_check
  CHECK (payment_type IN (
    'cash_on_collection', 'cash_on_delivery',
    'credit_debit_card', 'paypal', 'bank_transfer'
  ));
