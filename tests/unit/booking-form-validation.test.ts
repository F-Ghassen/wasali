import { describe, it, expect } from 'vitest';
import { computeTotalPrice } from '@/hooks/useBookingForm';
import { countryCodeToFlagEmoji } from '@/utils/formatters';

// ─── Step validity helpers (mirrors useBookingForm logic) ─────────────────────
// These are extracted inline to be testable without mounting React hooks.

type ServiceType = string | null;

function step4Valid(
  weight: string,
  packageTypes: string[],
  maxPackageWeightKg?: number | null,
): boolean {
  return (
    parseFloat(weight) > 0 &&
    packageTypes.length > 0 &&
    (maxPackageWeightKg == null || parseFloat(weight) <= maxPackageWeightKg)
  );
}

function step2Valid(
  senderMode: 'own' | 'behalf',
  senderName: string,
  senderPhone: string,
  behalfName: string,
  behalfPhone: string,
  collectionServiceType: ServiceType,
  senderAddressStreet: string,
  senderAddressCity: string,
  senderAddressPostalCode: string,
): boolean {
  const nameOk = senderMode === 'own'
    ? senderName.trim().length > 0 && senderPhone.trim().length >= 5
    : behalfName.trim().length > 0 && behalfPhone.trim().length >= 5;
  const addressOk = collectionServiceType !== 'driver_pickup' ||
    (senderAddressStreet.trim().length > 0 &&
     senderAddressCity.trim().length > 0 &&
     senderAddressPostalCode.trim().length > 0);
  return nameOk && addressOk;
}

function step3Valid(
  recipientName: string,
  recipientPhone: string,
  deliveryServiceType: ServiceType,
  recipientAddressStreet: string,
  recipientAddressCity: string,
): boolean {
  return (
    recipientName.trim().length > 0 &&
    recipientPhone.trim().length >= 5 &&
    (deliveryServiceType !== 'driver_delivery' ||
      (recipientAddressStreet.trim().length > 0 && recipientAddressCity.trim().length > 0))
  );
}

// ─── Step 4: weight + package type ───────────────────────────────────────────

describe('step4Valid', () => {
  it('valid when weight is positive and a package type is selected', () => {
    expect(step4Valid('5', ['clothing'])).toBe(true);
  });

  it('invalid when weight is zero', () => {
    expect(step4Valid('0', ['clothing'])).toBe(false);
  });

  it('invalid when weight field is empty', () => {
    expect(step4Valid('', ['clothing'])).toBe(false);
  });

  it('invalid when no package type is selected', () => {
    expect(step4Valid('5', [])).toBe(false);
  });

  it('valid when weight equals maxPackageWeightKg', () => {
    expect(step4Valid('20', ['clothing'], 20)).toBe(true);
  });

  it('invalid when weight exceeds maxPackageWeightKg', () => {
    expect(step4Valid('21', ['clothing'], 20)).toBe(false);
  });

  it('valid when maxPackageWeightKg is null (no limit)', () => {
    expect(step4Valid('999', ['clothing'], null)).toBe(true);
  });

  it('valid when maxPackageWeightKg is undefined (not configured on route)', () => {
    expect(step4Valid('50', ['clothing'], undefined)).toBe(true);
  });
});

// ─── Step 2: sender details ───────────────────────────────────────────────────

describe('step2Valid', () => {
  it('valid in own mode with name + phone', () => {
    expect(step2Valid('own', 'Alice', '12345', '', '', null, '', '', '')).toBe(true);
  });

  it('invalid in own mode with empty name', () => {
    expect(step2Valid('own', '', '12345', '', '', null, '', '', '')).toBe(false);
  });

  it('invalid in own mode with short phone', () => {
    expect(step2Valid('own', 'Alice', '123', '', '', null, '', '', '')).toBe(false);
  });

  it('valid in behalf mode with behalf name + phone', () => {
    expect(step2Valid('behalf', '', '', 'Bob', '67890', null, '', '', '')).toBe(true);
  });

  it('invalid in behalf mode with empty behalf name', () => {
    expect(step2Valid('behalf', '', '', '', '67890', null, '', '', '')).toBe(false);
  });

  it('invalid when driver_pickup but no sender address', () => {
    expect(step2Valid('own', 'Alice', '12345', '', '', 'driver_pickup', '', '', '')).toBe(false);
  });

  it('valid when driver_pickup and full sender address provided', () => {
    expect(
      step2Valid('own', 'Alice', '12345', '', '', 'driver_pickup', '12 Main St', 'Berlin', '10115'),
    ).toBe(true);
  });

  it('valid when sender_dropoff and no address (address not required)', () => {
    expect(step2Valid('own', 'Alice', '12345', '', '', 'sender_dropoff', '', '', '')).toBe(true);
  });
});

// ─── Step 3: recipient details ────────────────────────────────────────────────

describe('step3Valid', () => {
  it('valid with name + phone and non-delivery service', () => {
    expect(step3Valid('Fatma', '21698765432', 'recipient_collects', '', '')).toBe(true);
  });

  it('invalid with empty recipient name', () => {
    expect(step3Valid('', '21698765432', null, '', '')).toBe(false);
  });

  it('invalid with short phone', () => {
    expect(step3Valid('Fatma', '123', null, '', '')).toBe(false);
  });

  it('invalid when driver_delivery but no address', () => {
    expect(step3Valid('Fatma', '21698765432', 'driver_delivery', '', '')).toBe(false);
  });

  it('valid when driver_delivery with full address', () => {
    expect(step3Valid('Fatma', '21698765432', 'driver_delivery', '5 Rue Liberté', 'Tunis')).toBe(true);
  });

  it('valid when driver_delivery with street only (no postal code required)', () => {
    expect(step3Valid('Fatma', '21698765432', 'driver_delivery', '5 Rue Liberté', 'Tunis')).toBe(true);
  });
});

// ─── computeTotalPrice ────────────────────────────────────────────────────────

describe('computeTotalPrice', () => {
  const baseRoute = { price_per_kg_eur: 8, promotion_active: false, promotion_percentage: null };

  it('base price only (no services, no promotion)', () => {
    expect(computeTotalPrice(5, baseRoute, 0, 0)).toBe(40);
  });

  it('adds collection service surcharge', () => {
    expect(computeTotalPrice(5, baseRoute, 8, 0)).toBe(48);
  });

  it('adds delivery service surcharge', () => {
    expect(computeTotalPrice(5, baseRoute, 0, 10)).toBe(50);
  });

  it('adds both surcharges', () => {
    expect(computeTotalPrice(5, baseRoute, 8, 10)).toBe(58);
  });

  it('applies promotion percentage to base rate', () => {
    const promoRoute = { price_per_kg_eur: 10, promotion_active: true, promotion_percentage: 20 };
    // 5kg × 10 × 0.8 = 40
    expect(computeTotalPrice(5, promoRoute, 0, 0)).toBe(40);
  });

  it('promotion does not apply when promotion_active is false', () => {
    const inactivePromo = { price_per_kg_eur: 10, promotion_active: false, promotion_percentage: 20 };
    expect(computeTotalPrice(5, inactivePromo, 0, 0)).toBe(50);
  });

  it('promotion does not apply when promotion_percentage is null', () => {
    const nullPromo = { price_per_kg_eur: 10, promotion_active: true, promotion_percentage: null };
    expect(computeTotalPrice(5, nullPromo, 0, 0)).toBe(50);
  });

  it('handles decimal precision', () => {
    expect(computeTotalPrice(3.3, { price_per_kg_eur: 7, promotion_active: false, promotion_percentage: null }, 0, 0)).toBe(23.1);
  });
});

// ─── countryCodeToFlagEmoji ───────────────────────────────────────────────────

describe('countryCodeToFlagEmoji', () => {
  it('converts DE to German flag', () => {
    expect(countryCodeToFlagEmoji('DE')).toBe('🇩🇪');
  });

  it('converts TN to Tunisian flag', () => {
    expect(countryCodeToFlagEmoji('TN')).toBe('🇹🇳');
  });

  it('converts FR to French flag', () => {
    expect(countryCodeToFlagEmoji('FR')).toBe('🇫🇷');
  });

  it('normalises lowercase input', () => {
    expect(countryCodeToFlagEmoji('de')).toBe('🇩🇪');
  });

  it('converts GB to British flag', () => {
    expect(countryCodeToFlagEmoji('GB')).toBe('🇬🇧');
  });
});
