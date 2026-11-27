import { describe, it, expect } from 'vitest';
import { formatAddress, isSameCity } from '@/utils/addressFormat';
import { getPickupCandidates, pickPreferredAddress, toSenderPickupFields } from '@/utils/pickupAddress';
import { toAddressFormValues, toAddressRecord, EMPTY_ADDRESS_FORM } from '@/utils/addressForm';
import { savedAddressSchema } from '@/utils/validators';
import type { SavedAddress } from '@/types/models';

function address(overrides: Partial<SavedAddress> = {}): SavedAddress {
  return {
    id: 'a1',
    user_id: 'u1',
    label: 'Home',
    street: '1 Main St',
    city: 'Paris',
    country: 'France',
    postal_code: '75001',
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formatAddress', () => {
  it('joins street, postal code and city', () => {
    expect(formatAddress(address())).toBe('1 Main St, 75001 Paris');
  });

  it('omits a missing postal code', () => {
    expect(formatAddress(address({ postal_code: null }))).toBe('1 Main St, Paris');
  });
});

describe('isSameCity', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(isSameCity(' paris ', 'Paris')).toBe(true);
  });

  it('never matches empty values', () => {
    expect(isSameCity('', '')).toBe(false);
    expect(isSameCity(null, 'Paris')).toBe(false);
  });

  it('rejects a different city', () => {
    expect(isSameCity('Lyon', 'Paris')).toBe(false);
  });
});

describe('getPickupCandidates', () => {
  it('keeps only addresses in the collection city', () => {
    const list = [
      address({ id: 'p1', city: 'Paris' }),
      address({ id: 'l1', city: 'Lyon' }),
      address({ id: 'p2', city: ' paris' }),
    ];

    expect(getPickupCandidates(list, 'PARIS').map((a) => a.id)).toEqual(['p1', 'p2']);
  });

  it('returns nothing when no stop city is chosen yet', () => {
    expect(getPickupCandidates([address()], '')).toEqual([]);
  });
});

describe('pickPreferredAddress', () => {
  it('prefers the default among the candidates', () => {
    const list = [address({ id: 'x' }), address({ id: 'd', is_default: true })];

    expect(pickPreferredAddress(list)?.id).toBe('d');
  });

  it('falls back to the first candidate when none is default', () => {
    expect(pickPreferredAddress([address({ id: 'first' }), address({ id: 'second' })])?.id).toBe('first');
  });

  it('returns null for an empty list', () => {
    expect(pickPreferredAddress([])).toBeNull();
  });
});

describe('toSenderPickupFields', () => {
  it('maps street and postal code, never the city', () => {
    expect(toSenderPickupFields(address({ postal_code: null }))).toEqual({
      senderAddressStreet: '1 Main St',
      senderAddressPostalCode: '',
    });
  });
});

describe('toAddressFormValues and toAddressRecord', () => {
  it('round-trips a stored address through the form', () => {
    const stored = address();
    const values = toAddressFormValues(stored);

    expect(toAddressRecord(values)).toEqual({
      label: 'Home',
      street: '1 Main St',
      city: 'Paris',
      country: 'France',
      postal_code: '75001',
    });
  });

  it('writes a null postal code for a blank one', () => {
    expect(toAddressRecord({ ...EMPTY_ADDRESS_FORM, postalCode: '   ' }).postal_code).toBeNull();
  });
});

describe('savedAddressSchema', () => {
  it('requires label, street and city', () => {
    const result = savedAddressSchema.safeParse({ ...EMPTY_ADDRESS_FORM });

    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['label', 'street', 'city']));
  });

  it('accepts a complete address without postal code', () => {
    const result = savedAddressSchema.safeParse({
      label: 'Home',
      street: '1 Main',
      city: 'Paris',
      country: 'France',
    });

    expect(result.success).toBe(true);
  });
});
