import { PHONE_COUNTRIES } from '@/utils/phoneCountries';

export interface PhoneParts {
  /** Dial code from the country list, or null when the value has no known code. */
  countryCode: string | null;
  /** National number, digits only, no leading trunk zero. */
  number: string;
}

/** Keeps digits only and drops leading zeros. Mirrors normalize_phone_number() in migration 060. */
export function normalizePhoneNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, '').replace(/^0+/, '');
}

const CODES_LONGEST_FIRST = PHONE_COUNTRIES.map((c) => c.code).sort((a, b) => b.length - a.length);

/**
 * Splits a combined phone ("+21655000111") into its parts. The longest known
 * dial code wins. A value without a known code keeps its digits in `number`.
 */
export function splitPhone(phone: string): PhoneParts {
  const trimmed = phone.trim();
  const countryCode = CODES_LONGEST_FIRST.find((code) => trimmed.startsWith(code)) ?? null;
  if (!countryCode) {
    return { countryCode: null, number: normalizePhoneNumber(trimmed) };
  }
  return {
    countryCode,
    number: normalizePhoneNumber(trimmed.slice(countryCode.length)),
  };
}

/** Joins a dial code and a national number into the combined form stored in `phone`. */
export function joinPhone(countryCode: string, number: string): string {
  return `${countryCode}${normalizePhoneNumber(number)}`;
}
