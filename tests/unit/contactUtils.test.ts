import { describe, it, expect } from 'vitest';
import {
  hasSameAddress,
  isSavedRecipientSelected,
  pickDefaultAddress,
  toAddressList,
  toContactFormValues,
  toContactInput,
  toSavedRecipient,
} from '@/utils/contacts';
import { contactSchema } from '@/utils/validators';
import type { ContactRow, PersonAddress } from '@/types/contacts';

const HOME: PersonAddress = {
  id: 'a1',
  label: 'Home',
  street: '5 Rue',
  city: 'Sfax',
  country: 'Tunisia',
  postal_code: '3000',
  is_default: true,
};

const WORK: PersonAddress = { ...HOME, id: 'a2', label: 'Work', street: '9 Av', city: 'Tunis', is_default: false };

const WITH_ADDRESSES: ContactRow = {
  id: 'c1',
  name: 'Sami',
  phone: '+21620123456',
  phone_country_code: '+216',
  phone_number: '20123456',
  whatsapp_enabled: true,
  addresses: [WORK, HOME],
};

const NO_ADDRESS: ContactRow = {
  id: 'c2',
  name: 'Lina',
  phone: '+21655000111',
  phone_country_code: '+216',
  phone_number: '55000111',
  whatsapp_enabled: false,
  addresses: [],
};

describe('pickDefaultAddress', () => {
  it('returns the address marked default, even when it is not first', () => {
    expect(pickDefaultAddress([WORK, HOME])).toBe(HOME);
  });

  it('falls back to the first address when none is default', () => {
    expect(pickDefaultAddress([{ ...WORK, is_default: false }])?.id).toBe('a2');
  });

  it('returns null for a person without addresses', () => {
    expect(pickDefaultAddress([])).toBeNull();
  });
});

describe('toAddressList', () => {
  it('keeps an array as it is', () => {
    expect(toAddressList([WORK, HOME])).toEqual([WORK, HOME]);
  });

  it('wraps a single embedded address', () => {
    expect(toAddressList(HOME as never)).toEqual([HOME]);
  });

  it('returns an empty list for null or missing', () => {
    expect(toAddressList(null)).toEqual([]);
    expect(toAddressList(undefined)).toEqual([]);
  });
});

describe('hasSameAddress', () => {
  it('matches on street and city, ignoring case and spacing', () => {
    expect(hasSameAddress([HOME], { street: ' 5 RUE ', city: 'sfax', postal_code: null })).toBe(true);
  });

  it('does not match a different street or city', () => {
    expect(hasSameAddress([HOME], { street: '5 Rue', city: 'Tunis', postal_code: null })).toBe(false);
    expect(hasSameAddress([], { street: '5 Rue', city: 'Sfax', postal_code: null })).toBe(false);
  });
});

describe('toSavedRecipient', () => {
  it('prefills from the default address', () => {
    expect(toSavedRecipient(WITH_ADDRESSES)).toEqual({
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

  it('uses nulls when the person has no address', () => {
    expect(toSavedRecipient(NO_ADDRESS)).toMatchObject({
      address_street: null,
      address_city: null,
      address_postal_code: null,
    });
  });
});

describe('toContactFormValues and toContactInput', () => {
  it('maps a person onto the form and back, without addresses', () => {
    const values = toContactFormValues(WITH_ADDRESSES);

    expect(values).toEqual({
      name: 'Sami',
      countryCode: '+216',
      phoneNumber: '20123456',
      whatsappEnabled: true,
    });
    expect(toContactInput(values)).toEqual({
      name: 'Sami',
      phoneCountryCode: '+216',
      phoneNumber: '20123456',
      whatsappEnabled: true,
    });
  });

  it('trims the name and strips spaces and leading zeros from the number', () => {
    const input = toContactInput({
      name: '  Sami B  ',
      countryCode: '+216',
      phoneNumber: '020 123 456',
      whatsappEnabled: false,
    });

    expect(input).toMatchObject({ name: 'Sami B', phoneNumber: '20123456' });
  });
});

describe('contactSchema', () => {
  const base = { name: 'Sami', countryCode: '+216', phoneNumber: '20123456', whatsappEnabled: false };

  it('accepts a person with name and phone only', () => {
    expect(contactSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a short name', () => {
    expect(contactSchema.safeParse({ ...base, name: 'L' }).success).toBe(false);
  });

  it('rejects an invalid phone number', () => {
    expect(contactSchema.safeParse({ ...base, phoneNumber: '12ab' }).success).toBe(false);
  });

  it('rejects an unknown country code', () => {
    expect(contactSchema.safeParse({ ...base, countryCode: '+999' }).success).toBe(false);
  });
});

describe('isSavedRecipientSelected', () => {
  const sami = { phone: '+21620123456', phone_country_code: '+216', phone_number: '20123456' };
  const samiTwin = { phone: '+21655111222', phone_country_code: '+216', phone_number: '55111222' };

  it('matches only the saved recipient whose phone the form holds', () => {
    const form = { countryCode: '+216', number: '20123456' };

    expect(isSavedRecipientSelected(sami, form)).toBe(true);
    expect(isSavedRecipientSelected(samiTwin, form)).toBe(false);
  });

  it('falls back to the combined phone for rows saved before migration 060', () => {
    const legacy = { phone: '+21620123456', phone_country_code: null, phone_number: null };

    expect(isSavedRecipientSelected(legacy, { countryCode: '+216', number: '20123456' })).toBe(true);
  });
});
