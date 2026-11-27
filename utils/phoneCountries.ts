export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, stored as profiles.country_code. */
  iso: string;
  flag: string;
  code: string;
  name: string;
}

/** Dial codes offered in every phone field. Longer codes must not be prefixes of shorter ones. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: 'DE', flag: '🇩🇪', code: '+49', name: 'Germany' },
  { iso: 'FR', flag: '🇫🇷', code: '+33', name: 'France' },
  { iso: 'IT', flag: '🇮🇹', code: '+39', name: 'Italy' },
  { iso: 'BE', flag: '🇧🇪', code: '+32', name: 'Belgium' },
  { iso: 'NL', flag: '🇳🇱', code: '+31', name: 'Netherlands' },
  { iso: 'ES', flag: '🇪🇸', code: '+34', name: 'Spain' },
  { iso: 'GB', flag: '🇬🇧', code: '+44', name: 'United Kingdom' },
  { iso: 'TN', flag: '🇹🇳', code: '+216', name: 'Tunisia' },
  { iso: 'US', flag: '🇺🇸', code: '+1', name: 'United States' },
];

export const DEFAULT_PHONE_COUNTRY_CODE = '+216';

export function isKnownCountryCode(code: string): boolean {
  return PHONE_COUNTRIES.some((c) => c.code === code);
}

export function findPhoneCountry(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

export function isKnownCountryIso(iso: string): boolean {
  return PHONE_COUNTRIES.some((c) => c.iso === iso);
}

export function findCountryByIso(iso: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.iso === iso);
}
