import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, splitPhone, joinPhone } from '@/utils/phone';
import { findPhoneCountry, isKnownCountryCode } from '@/utils/phoneCountries';
import { toProfileFormValues, toProfileUpdate } from '@/utils/profileForm';
import { phoneNumberSchema } from '@/utils/validators';

describe('normalizePhoneNumber', () => {
  it('keeps digits and drops spaces, dashes, and leading zeros', () => {
    expect(normalizePhoneNumber(' 055-000 111 ')).toBe('55000111');
  });
});

describe('splitPhone', () => {
  it('splits a Tunisian number on its code', () => {
    expect(splitPhone('+21655000111')).toEqual({ countryCode: '+216', number: '55000111' });
  });

  it('prefers the longest known code', () => {
    expect(splitPhone('+1415555123')).toEqual({ countryCode: '+1', number: '415555123' });
    expect(splitPhone('+44 7700 900123')).toEqual({ countryCode: '+44', number: '7700900123' });
  });

  it('keeps the digits and no code when the prefix is unknown', () => {
    expect(splitPhone('+99912345')).toEqual({ countryCode: null, number: '99912345' });
  });
});

describe('joinPhone', () => {
  it('builds the combined phone and strips a trunk zero', () => {
    expect(joinPhone('+33', '06 12 34 56 78')).toBe('+33612345678');
  });

  it('round-trips with splitPhone', () => {
    const parts = splitPhone('+4915112345678');
    expect(joinPhone(parts.countryCode ?? '', parts.number)).toBe('+4915112345678');
  });
});

describe('country list', () => {
  it('recognises listed codes only', () => {
    expect(isKnownCountryCode('+216')).toBe(true);
    expect(isKnownCountryCode('+999')).toBe(false);
  });

  it('finds the country for a code', () => {
    expect(findPhoneCountry('+49')?.name).toBe('Germany');
  });
});

describe('phoneNumberSchema', () => {
  it('accepts spaced national numbers', () => {
    expect(phoneNumberSchema.safeParse('55 000 111').success).toBe(true);
  });

  it('rejects a leading plus sign', () => {
    expect(phoneNumberSchema.safeParse('+21655000111').success).toBe(false);
  });
});

describe('toProfileFormValues and toProfileUpdate', () => {
  it('reads the stored parts', () => {
    expect(
      toProfileFormValues({
        full_name: 'Amel',
        phone: '+21655000111',
        phone_country_code: '+216',
        phone_number: '55000111',
        country_code: 'TN',
      }),
    ).toEqual({ fullName: 'Amel', countryCode: '+216', phoneNumber: '55000111', countryIso: 'TN' });
  });

  it('falls back to splitting the combined phone for profiles saved before migration 060', () => {
    expect(
      toProfileFormValues({
        full_name: 'Amel',
        phone: '+33612345678',
        phone_country_code: null,
        phone_number: null,
        country_code: null,
      }),
    ).toEqual({ fullName: 'Amel', countryCode: '+33', phoneNumber: '612345678', countryIso: '' });
  });

  it('defaults to Tunisia for a new profile with no phone', () => {
    expect(toProfileFormValues(null)).toEqual({ fullName: '', countryCode: '+216', phoneNumber: '', countryIso: '' });
  });

  it('writes the parts and the combined phone', () => {
    expect(
      toProfileUpdate({ fullName: ' Amel ', countryCode: '+216', phoneNumber: '055 000 111', countryIso: 'TN' }),
    ).toEqual({
      full_name: 'Amel',
      phone: '+21655000111',
      phone_country_code: '+216',
      phone_number: '55000111',
      country_code: 'TN',
    });
  });

  it('clears all phone columns when the number is empty', () => {
    expect(toProfileUpdate({ fullName: 'Amel', countryCode: '+216', phoneNumber: '', countryIso: '' })).toEqual({
      full_name: 'Amel',
      phone: null,
      phone_country_code: null,
      phone_number: null,
      country_code: null,
    });
  });
});
