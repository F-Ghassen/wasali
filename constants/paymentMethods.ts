/**
 * constants/paymentMethods.ts
 *
 * Single source of truth for the platform's payment method catalogue —
 * previously duplicated as `ALL_PAYMENT_TYPES`/`PLATFORM_COMING_SOON` in
 * components/booking/PaymentOption.tsx + PaymentStep.tsx (sender booking
 * creation) and `MANUAL_PAYMENT_TYPES` in app/driver/bookings/[id].tsx
 * (driver detail screen).
 *
 * Per-route enablement (which of these a given driver's route accepts) is
 * still stored in the `route_payment_methods` table — this constant defines
 * the full catalogue, display metadata, and the platform-level gate
 * (methods not yet live regardless of driver config). It's a plain object
 * literal today; once the admin layer exists to manage per-driver
 * integrations, this is the seam where that config would be read from
 * instead, without touching call sites.
 */

export const PAYMENT_TYPES = [
  'cash_on_collection',
  'cash_on_delivery',
  'credit_debit_card',
  'paypal',
  'bank_transfer',
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

export interface PaymentMethodMeta {
  type: PaymentType;
  /** i18n key under `booking.paymentTypes.<key>.label` */
  labelKey: string;
  /** i18n key under `booking.paymentTypes.<key>.description` */
  descriptionKey: string;
  /** Enabled by default on a route with no `route_payment_methods` rows configured. */
  enabledByDefault: boolean;
  /** Platform-level gate — "coming soon" regardless of per-driver/route config. */
  platformComingSoon: boolean;
}

export const PAYMENT_METHODS: Record<PaymentType, PaymentMethodMeta> = {
  cash_on_collection: {
    type: 'cash_on_collection',
    labelKey: 'booking.paymentTypes.cashOnCollection.label',
    descriptionKey: 'booking.paymentTypes.cashOnCollection.description',
    enabledByDefault: true,
    platformComingSoon: false,
  },
  cash_on_delivery: {
    type: 'cash_on_delivery',
    labelKey: 'booking.paymentTypes.cashOnDelivery.label',
    descriptionKey: 'booking.paymentTypes.cashOnDelivery.description',
    enabledByDefault: true,
    platformComingSoon: false,
  },
  credit_debit_card: {
    type: 'credit_debit_card',
    labelKey: 'booking.paymentTypes.creditDebitCard.label',
    descriptionKey: 'booking.paymentTypes.creditDebitCard.description',
    enabledByDefault: false,
    platformComingSoon: true,
  },
  paypal: {
    type: 'paypal',
    labelKey: 'booking.paymentTypes.paypal.label',
    descriptionKey: 'booking.paymentTypes.paypal.description',
    enabledByDefault: false,
    platformComingSoon: true,
  },
  bank_transfer: {
    type: 'bank_transfer',
    labelKey: 'booking.paymentTypes.bankTransfer.label',
    descriptionKey: 'booking.paymentTypes.bankTransfer.description',
    enabledByDefault: false,
    platformComingSoon: true,
  },
};

/** Cash payment types — the only methods that can be marked paid manually today. */
export const CASH_PAYMENT_TYPES = ['cash_on_collection', 'cash_on_delivery'] as const;
export type CashPaymentType = (typeof CASH_PAYMENT_TYPES)[number];

export function isCashPaymentType(paymentType: string | null | undefined): paymentType is CashPaymentType {
  return paymentType === 'cash_on_collection' || paymentType === 'cash_on_delivery';
}

/**
 * Given a route's configured `route_payment_methods` rows (possibly empty —
 * no config means "both cash methods enabled" as a fallback), returns each
 * catalogue entry annotated with whether it's actually selectable for this
 * route right now (driver-enabled AND not platform-gated).
 */
export function resolvePaymentMethods(
  routePaymentMethods: { payment_type: string; enabled: boolean }[],
): (PaymentMethodMeta & { driverEnabled: boolean; selectable: boolean })[] {
  const enabledMap: Record<string, boolean> = routePaymentMethods.length > 0
    ? Object.fromEntries(routePaymentMethods.map((m) => [m.payment_type, m.enabled]))
    : { cash_on_collection: true, cash_on_delivery: true };

  return PAYMENT_TYPES.map((type) => {
    const meta = PAYMENT_METHODS[type];
    const driverEnabled = enabledMap[type] ?? meta.enabledByDefault;
    return {
      ...meta,
      driverEnabled,
      selectable: driverEnabled && !meta.platformComingSoon,
    };
  });
}
