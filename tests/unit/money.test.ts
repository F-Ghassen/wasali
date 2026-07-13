import { describe, it, expect } from 'vitest';
import { splitBookingMoney, roundCents } from '@/utils/money';

describe('roundCents', () => {
  it('rounds to whole cents', () => {
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(2.344)).toBe(2.34);
    expect(roundCents(10)).toBe(10);
  });
});

describe('splitBookingMoney', () => {
  it('launch default (both rates 0): total == shipping == driver payout', () => {
    const m = splitBookingMoney({ shipping: 42.5 });
    expect(m.shippingEur).toBe(42.5);
    expect(m.serviceFeeEur).toBe(0);
    expect(m.totalPrice).toBe(42.5);
    expect(m.driverCommissionEur).toBe(0);
    expect(m.driverPayoutEur).toBe(42.5);
  });

  it('service fee is added on top of shipping (sender pays more)', () => {
    const m = splitBookingMoney({ shipping: 100, serviceFeeRatePct: 5 });
    expect(m.serviceFeeEur).toBe(5);
    expect(m.totalPrice).toBe(105);
    // Driver commission untouched — the two levers are independent.
    expect(m.driverPayoutEur).toBe(100);
  });

  it('driver commission is taken out of shipping (driver keeps less)', () => {
    const m = splitBookingMoney({ shipping: 100, driverCommissionRatePct: 10 });
    expect(m.driverCommissionEur).toBe(10);
    expect(m.driverPayoutEur).toBe(90);
    // Sender total untouched by the driver-side lever.
    expect(m.totalPrice).toBe(100);
  });

  it('both levers apply independently', () => {
    const m = splitBookingMoney({
      shipping: 200,
      serviceFeeRatePct: 5,
      driverCommissionRatePct: 10,
    });
    expect(m.totalPrice).toBe(210); // 200 + 5%
    expect(m.driverPayoutEur).toBe(180); // 200 − 10%
  });

  it('rounds fee and commission to cents', () => {
    const m = splitBookingMoney({
      shipping: 33.33,
      serviceFeeRatePct: 7,
      driverCommissionRatePct: 7,
    });
    expect(m.serviceFeeEur).toBe(2.33); // 33.33 * 0.07 = 2.3331
    expect(m.driverCommissionEur).toBe(2.33);
    expect(m.totalPrice).toBe(35.66);
    expect(m.driverPayoutEur).toBe(31.0);
  });
});
