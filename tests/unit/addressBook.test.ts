import { describe, it, expect } from 'vitest';
import {
  addressBookResolver,
  emptyAddressBookValues,
  personToFormValues,
  placeToFormValues,
  toPersonData,
  toPlaceData,
} from '@/utils/addressBookForm';
import type { ContactRow } from '@/types/contacts';
import type { SavedAddress } from '@/types/models';

const resolverOptions = {} as Parameters<typeof addressBookResolver>[2];

function place(overrides: Partial<SavedAddress> = {}): SavedAddress {
  return {
    id: 'a1',
    user_id: 'u1',
    label: 'Home',
    street: '12 Rue X',
    city: 'Paris',
    country: 'France',
    postal_code: '75011',
    is_default: true,
    ...overrides,
  } as SavedAddress;
}

function contact(overrides: Partial<ContactRow> = {}): ContactRow {
  return {
    id: 'c1',
    user_id: 'u1',
    name: 'Amine',
    phone: '+216 20 123 456',
    whatsapp_enabled: true,
    addresses: [],
    ...overrides,
  } as ContactRow;
}

describe('address book form mapping', () => {
  it('maps a place into place values and back', () => {
    const values = placeToFormValues(place());

    expect(values.type).toBe('place');
    expect(toPlaceData(values)).toEqual({
      label: 'Home',
      street: '12 Rue X',
      city: 'Paris',
      country: 'France',
      postalCode: '75011',
    });
  });

  it('maps a person onto the person fields only', () => {
    const values = personToFormValues(contact({ addresses: [] }));

    expect(values.type).toBe('person');
    expect(values.name).toBe('Amine');
    expect(toPersonData(values)).toEqual({
      name: 'Amine',
      countryCode: values.countryCode,
      phoneNumber: values.phoneNumber,
      whatsappEnabled: true,
    });
  });

  it('starts an empty form with the place defaults', () => {
    const values = emptyAddressBookValues('place');

    expect(values).toMatchObject({ type: 'place', country: 'Tunisia', label: '' });
  });
});

describe('addressBookResolver', () => {
  it('accepts a place without a label', async () => {
    const result = await addressBookResolver(
      { ...emptyAddressBookValues('place'), street: 's', city: 'c', country: 'Germany', postalCode: '10115' },
      undefined,
      resolverOptions,
    );

    expect(result.errors).toEqual({});
  });

  it('does not require a country or label for a person', async () => {
    const result = await addressBookResolver(
      { ...emptyAddressBookValues('person'), name: 'Amine', phoneNumber: '20123456' },
      undefined,
      resolverOptions,
    );

    expect(result.errors.label).toBeUndefined();
    expect(result.errors.country).toBeUndefined();
    expect(result.errors.name).toBeUndefined();
  });

  it('keeps the form type on success so the submit handler can tell the kinds apart', async () => {
    const values = { ...emptyAddressBookValues('place'), label: 'Home', street: 's', city: 'c', postalCode: '1000' };
    const result = await addressBookResolver(values, undefined, resolverOptions);

    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({ type: 'place', label: 'Home' });
  });

  it('requires a name for a person', async () => {
    const result = await addressBookResolver(
      { ...emptyAddressBookValues('person'), phoneNumber: '20123456' },
      undefined,
      resolverOptions,
    );

    expect(result.errors.name).toBeDefined();
  });
});
