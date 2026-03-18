import { describe, it, expect } from 'vitest';

// Inline price computation logic (mirrors bookingStore.ts)
function computePrice(
  pricePerKgEur: number,
  weightKg: number,
  pickupType: 'sender_dropoff' | 'driver_pickup',
  dropoffType: 'recipient_pickup' | 'home_delivery'
): number {
  const base = pricePerKgEur * weightKg;
  const pickupSurcharge = pickupType === 'driver_pickup' ? 8 : 0;
  const deliverySurcharge = dropoffType === 'home_delivery' ? 10 : 0;
  return Math.round((base + pickupSurcharge + deliverySurcharge) * 100) / 100;
}

describe('computePrice', () => {
  it('sender_dropoff + recipient_pickup applies no surcharges', () => {
    expect(computePrice(8, 5, 'sender_dropoff', 'recipient_pickup')).toBe(40);
  });

  it('driver_pickup + recipient_pickup adds 8 EUR pickup surcharge', () => {
    expect(computePrice(8, 5, 'driver_pickup', 'recipient_pickup')).toBe(48);
  });

  it('sender_dropoff + home_delivery adds 10 EUR delivery surcharge', () => {
    expect(computePrice(8, 5, 'sender_dropoff', 'home_delivery')).toBe(50);
  });

  it('driver_pickup + home_delivery adds both surcharges (18 EUR)', () => {
    expect(computePrice(8, 5, 'driver_pickup', 'home_delivery')).toBe(58);
  });

  it('handles decimal precision: 3.3kg * 7 EUR = 23.1', () => {
    expect(computePrice(7, 3.3, 'sender_dropoff', 'recipient_pickup')).toBe(23.1);
  });

  it('zero weight still applies surcharges', () => {
    expect(computePrice(8, 0, 'driver_pickup', 'recipient_pickup')).toBe(8);
  });

  it('high value: 30kg * 12.5 EUR + both surcharges = 393', () => {
    expect(computePrice(12.5, 30, 'driver_pickup', 'home_delivery')).toBe(393);
  });
});
