# ADR 0004 — Cash Only at Launch; Card "Coming Soon"

- **Status:** Accepted
- **Date:** 2026-07-13
- **Context:** Trips & Bookings blueprint (`docs/blueprint/trips-and-bookings.md`).

## Context

The repo contains a Stripe manual-capture escrow flow (`create-payment-intent`, `stripe-webhook`,
`capture-payment`), but `create-payment-intent` is never invoked — card bookings never authorize
funds. Cash works via a driver-side "Mark as Paid" action.

A product decision was made for launch scope and payment custody.

## Decision

**Cash is the only functional payment method at launch.** Cash is **handed directly to the driver**
by the sender (at collection) or the recipient (at delivery). **The platform never holds funds —
there is no escrow on the cash path.** "Mark as Paid" (`driverBookingStore.markPaid`) is a
driver-side bookkeeping flag recording receipt; it moves no money and the platform cannot capture
or refund it.

**Card / PayPal is rendered "Coming soon" — visible but disabled.** It cannot be selected and a
booking cannot be submitted with a card method (`bookingSubmitSchema` rejects non-cash payment
types at launch). The Stripe functions remain in the repo, unwired.

## Consequences

- Launch UI copy must state plainly that Wasali does not hold cash and payment is arranged directly
  with the driver.
- `payment_status` uses only `unpaid → paid` at launch; `captured`/`refunded` are reserved for the
  future card phase.
- The future card phase (out of launch scope) wires `create-payment-intent` into the submit path
  (`useBookingSubmit`), confirms via webhook, captures on delivery, and refunds on cancel — then
  flips the card option from disabled to enabled. See the blueprint §2c.
- Marking card/PayPal disabled is centralized (a `comingSoon` flag on the payment-method config)
  so a single change enables it later.
