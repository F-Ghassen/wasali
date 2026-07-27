import { describe, it, expect } from 'vitest';
import { computeShippingPrice } from '@/utils/pricing';
import { computeTotalPrice } from '@/hooks/useBookingForm';

// utils/pricing.ts extracts the formula previously inlined in
// hooks/useBookingForm.ts (computeTotalPrice), so both the sender's
// booking-creation flow and the driver's mid-pickup weight adjustment
// (stores/driverBookingStore.ts adjustPackageWeight) share one source of
// truth. computeTotalPrice is kept as a re-export for existing callers —
// assert here that both produce identical output for the same inputs.

describe('computeShippingPrice', () => {
  const baseRoute = { price_per_kg_eur: 8, promotion_active: false, promotion_percentage: null };

  it('base price only (no services, no promotion)', () => {
    expect(computeShippingPrice(5, baseRoute, 0, 0)).toBe(40);
  });

  it('adds collection + delivery service surcharges', () => {
    expect(computeShippingPrice(5, baseRoute, 8, 10)).toBe(58);
  });

  it('applies an active promotion to the per-kg rate', () => {
    const promoRoute = { price_per_kg_eur: 10, promotion_active: true, promotion_percentage: 20 };
    expect(computeShippingPrice(5, promoRoute, 0, 0)).toBe(40);
  });

  it('matches useBookingForm.computeTotalPrice for the same inputs (extraction parity)', () => {
    const route = { price_per_kg_eur: 6.5, promotion_active: true, promotion_percentage: 15 };
    expect(computeShippingPrice(12.4, route, 5, 7)).toBe(computeTotalPrice(12.4, route, 5, 7));
  });
});
