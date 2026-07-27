/**
 * utils/pricing.ts
 *
 * Shipping-price formula — single source of truth for turning a package
 * weight + route rate + service fees into a shipping subtotal. Used by the
 * sender's booking-creation wizard (via hooks/useBookingForm.ts, which
 * re-exports {@link computeShippingPrice} as `computeTotalPrice` for
 * backward compatibility) and by the driver's mid-pickup weight adjustment
 * (stores/driverBookingStore.ts `adjustPackageWeight`).
 *
 * Pure and deterministic — no side effects, safe to call from a store action
 * or a component.
 */

export interface RoutePricingInput {
  price_per_kg_eur: number;
  promotion_active: boolean | null;
  promotion_percentage: number | null;
}

/**
 * Shipping subtotal for a given weight against a route's price-per-kg
 * (discounted by an active promotion, if any) plus flat collection/delivery
 * service fees. Rounded to whole cents.
 */
export function computeShippingPrice(
  weightKg: number,
  route: RoutePricingInput,
  collectionServicePrice: number,
  deliveryServicePrice: number,
): number {
  const effectiveRate = route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;

  return Math.round(
    (weightKg * effectiveRate + collectionServicePrice + deliveryServicePrice) * 100,
  ) / 100;
}
