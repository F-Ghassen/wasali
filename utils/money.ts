/**
 * utils/money.ts
 *
 * Single source of truth for booking money math. The two platform levers —
 * a sender-paid service fee and a driver commission — are independent and both
 * default to 0% at launch (see docs/adr/0003). At 0/0 the numbers are identical
 * to today: total_price == shipping == driver_payout.
 *
 * total_price       = shipping + service_fee        (what the sender pays)
 * driver_payout_eur = shipping - driver_commission  (what the driver keeps)
 *
 * Rates come from platform_config (server-side); the client never chooses them.
 */

/** Round to whole cents, avoiding binary float drift (e.g. 1.005 -> 1.01). */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface BookingMoneyInput {
  /** Shipping subtotal: weight × effective rate + collection + delivery fees. */
  shipping: number;
  /** Sender-paid service fee rate, percent. Default 0. */
  serviceFeeRatePct?: number;
  /** Driver commission rate, percent. Default 0. */
  driverCommissionRatePct?: number;
}

export interface BookingMoney {
  shippingEur: number;
  serviceFeeEur: number;
  /** What the sender pays: shipping + service fee. */
  totalPrice: number;
  driverCommissionEur: number;
  /** What the driver keeps: shipping − commission. */
  driverPayoutEur: number;
  serviceFeeRatePct: number;
  driverCommissionRatePct: number;
}

/**
 * Split a shipping subtotal into the full money breakdown. Pure and
 * deterministic — safe to reuse at submit (to build the booking row) and in
 * display (order summary, earnings).
 */
export function splitBookingMoney({
  shipping,
  serviceFeeRatePct = 0,
  driverCommissionRatePct = 0,
}: BookingMoneyInput): BookingMoney {
  const shippingEur = roundCents(shipping);
  const serviceFeeEur = roundCents((shippingEur * serviceFeeRatePct) / 100);
  const driverCommissionEur = roundCents((shippingEur * driverCommissionRatePct) / 100);

  return {
    shippingEur,
    serviceFeeEur,
    totalPrice: roundCents(shippingEur + serviceFeeEur),
    driverCommissionEur,
    driverPayoutEur: roundCents(shippingEur - driverCommissionEur),
    serviceFeeRatePct,
    driverCommissionRatePct,
  };
}
