/** Version of the terms and privacy policy shown at sign-up. Bump when the text changes. */
export const TERMS_VERSION = 'v1';

export interface ConsentPatch {
  analytics_consent_at: string | null;
}

export interface MarketingConsentPatch {
  marketing_consent_at: string | null;
}

/** Analytics runs only after the user has opted in. A null timestamp means not consented. */
export function hasAnalyticsConsent(analyticsConsentAt: string | null | undefined): boolean {
  return Boolean(analyticsConsentAt);
}

/** Profile columns to write when the user opts in or out of analytics. */
export function consentPatch(granted: boolean, now: Date): ConsentPatch {
  return { analytics_consent_at: granted ? now.toISOString() : null };
}

/** Profile columns to write when the user opts in or out of marketing emails. */
export function marketingConsentPatch(granted: boolean, now: Date): MarketingConsentPatch {
  return { marketing_consent_at: granted ? now.toISOString() : null };
}

/** True once the user has opted in to marketing emails. */
export function hasMarketingConsent(marketingConsentAt: string | null | undefined): boolean {
  return Boolean(marketingConsentAt);
}
