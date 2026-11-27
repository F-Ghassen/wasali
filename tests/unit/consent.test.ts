import { describe, it, expect } from 'vitest';
import {
  consentPatch,
  hasAnalyticsConsent,
  hasMarketingConsent,
  marketingConsentPatch,
  TERMS_VERSION,
} from '@/utils/consent';
import { isKnownCountryIso, findCountryByIso, PHONE_COUNTRIES } from '@/utils/phoneCountries';

describe('hasAnalyticsConsent', () => {
  it('is false when the user has never opted in', () => {
    expect(hasAnalyticsConsent(null)).toBe(false);
    expect(hasAnalyticsConsent(undefined)).toBe(false);
  });

  it('is true once a consent timestamp is stored', () => {
    expect(hasAnalyticsConsent('2026-11-27T10:00:00.000Z')).toBe(true);
  });
});

describe('consentPatch', () => {
  const now = new Date('2026-11-27T10:00:00.000Z');

  it('stamps the time on opt-in', () => {
    expect(consentPatch(true, now)).toEqual({ analytics_consent_at: '2026-11-27T10:00:00.000Z' });
  });

  it('clears the timestamp on opt-out', () => {
    expect(consentPatch(false, now)).toEqual({ analytics_consent_at: null });
  });
});

describe('hasMarketingConsent and marketingConsentPatch', () => {
  const now = new Date('2026-11-27T10:00:00.000Z');

  it('is false when the user has not opted in', () => {
    expect(hasMarketingConsent(null)).toBe(false);
  });

  it('is true once a consent timestamp is stored', () => {
    expect(hasMarketingConsent('2026-11-27T10:00:00.000Z')).toBe(true);
  });

  it('stamps the time on opt-in and clears it on opt-out', () => {
    expect(marketingConsentPatch(true, now)).toEqual({ marketing_consent_at: '2026-11-27T10:00:00.000Z' });
    expect(marketingConsentPatch(false, now)).toEqual({ marketing_consent_at: null });
  });
});

describe('residence country lookup', () => {
  it('accepts a listed ISO code and rejects anything else', () => {
    expect(isKnownCountryIso('TN')).toBe(true);
    expect(isKnownCountryIso('XX')).toBe(false);
    expect(isKnownCountryIso('')).toBe(false);
  });

  it('returns the country for a listed ISO code', () => {
    expect(findCountryByIso('FR')?.name).toBe('France');
    expect(findCountryByIso('XX')).toBeUndefined();
  });

  it('gives every dial-code entry a unique ISO code', () => {
    const isos = PHONE_COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });
});

describe('TERMS_VERSION', () => {
  it('is set', () => {
    expect(TERMS_VERSION).toMatch(/^v\d+$/);
  });
});
