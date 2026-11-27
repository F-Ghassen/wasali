import { describe, it, expect } from 'vitest';
import { toSavedRecipient, toContactFormValues, toContactInput, withoutContactLinks } from '@/utils/contacts';
import { contactSchema } from '@/utils/validators';
import type { ContactRow } from '@/types/contacts';

const WITH_ADDRESS: ContactRow = {
  id: 'c1',
  name: 'Sami',
  phone: '+21620123456',
  phone_country_code: '+216',
  phone_number: '20123456',
  whatsapp_enabled: true,
  address: { street: '5 Rue', city: 'Sfax', postal_code: '3000' },
};

const NO_ADDRESS: ContactRow = {
  id: 'c2',
  name: 'Lina',
  phone: '+21655000111',
  phone_country_code: '+216',
  phone_number: '55000111',
  whatsapp_enabled: false,
  address: null,
};

describe('toSavedRecipient', () => {
  it('flattens the embedded address into prefill fields', () => {
    expect(toSavedRecipient(WITH_ADDRESS)).toEqual({
      id: 'c1',
      name: 'Sami',
      phone: '+21620123456',
      phone_country_code: '+216',
      phone_number: '20123456',
      whatsapp_enabled: true,
      address_street: '5 Rue',
      address_city: 'Sfax',
      address_postal_code: '3000',
    });
  });

  it('uses nulls when the contact has no address', () => {
    expect(toSavedRecipient(NO_ADDRESS)).toMatchObject({
      address_street: null,
      address_city: null,
      address_postal_code: null,
    });
  });
});

describe('withoutContactLinks', () => {
  it('removes rows that belong to a contact and keeps the rest', () => {
    const rows = [
      { id: 'a1', contacts: [] },
      { id: 'a2', contacts: [{ id: 'c1' }] },
    ];

    expect(withoutContactLinks(rows)).toEqual([{ id: 'a1' }]);
  });
});

describe('toContactFormValues and toContactInput', () => {
  it('maps a contact with an address onto the form and back', () => {
    const values = toContactFormValues(WITH_ADDRESS);

    expect(toContactInput(values)).toEqual({
      name: 'Sami',
      phoneCountryCode: '+216',
      phoneNumber: '20123456',
      whatsappEnabled: true,
      address: { street: '5 Rue', city: 'Sfax', postal_code: '3000' },
    });
  });

  it('writes no address when only the postal code is filled', () => {
    const input = toContactInput({
      name: 'Lina',
      countryCode: '+216',
      phoneNumber: '55000111',
      whatsappEnabled: false,
      street: '',
      city: '',
      postalCode: '1000',
    });

    expect(input.address).toBeNull();
  });

  it('trims the name and strips spaces and leading zeros from the number', () => {
    const input = toContactInput({
      name: '  Lina  ',
      countryCode: '+216',
      phoneNumber: ' 055 000 111 ',
      whatsappEnabled: false,
      street: '2 Rue',
      city: 'Tunis',
      postalCode: '  ',
    });

    expect(input.name).toBe('Lina');
    expect(input.phoneCountryCode).toBe('+216');
    expect(input.phoneNumber).toBe('55000111');
    expect(input.address?.postal_code).toBeNull();
  });

  it('gives an empty form for a contact without an address', () => {
    expect(toContactFormValues(NO_ADDRESS)).toMatchObject({ street: '', city: '', postalCode: '' });
  });
});

describe('contactSchema', () => {
  const base = { name: 'Lina', countryCode: '+216', phoneNumber: '55 000 111', whatsappEnabled: false };

  it('accepts a contact without an address', () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an address that has a postal code but no street or city', () => {
    const result = contactSchema.safeParse({ ...base, postalCode: '1000' });

    expect(result.success).toBe(false);
  });

  it('rejects a street without a city', () => {
    expect(contactSchema.safeParse({ ...base, street: '2 Rue' }).success).toBe(false);
  });

  it('rejects a number with letters or too few digits', () => {
    expect(contactSchema.safeParse({ ...base, phoneNumber: '12ab' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, phoneNumber: '123' }).success).toBe(false);
  });

  it('rejects a number typed with its country code', () => {
    expect(contactSchema.safeParse({ ...base, phoneNumber: '+21655000111' }).success).toBe(false);
  });

  it('rejects an unknown country code', () => {
    expect(contactSchema.safeParse({ ...base, countryCode: '+999' }).success).toBe(false);
  });

  it('rejects a one-letter name', () => {
    expect(contactSchema.safeParse({ ...base, name: 'L' }).success).toBe(false);
  });
});
