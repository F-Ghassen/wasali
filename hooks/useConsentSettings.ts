import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  consentPatch,
  hasAnalyticsConsent,
  hasMarketingConsent,
  marketingConsentPatch,
} from '@/utils/consent';

/** Reads and writes the analytics and marketing consent stored on the profile. */
export function useConsentSettings(): {
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  setAnalytics: (granted: boolean) => Promise<void>;
  setMarketing: (granted: boolean) => Promise<void>;
} {
  const analyticsConsentAt = useAuthStore((s) => s.profile?.analytics_consent_at ?? null);
  const marketingConsentAt = useAuthStore((s) => s.profile?.marketing_consent_at ?? null);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const setAnalytics = useCallback(
    (granted: boolean) => updateProfile(consentPatch(granted, new Date())),
    [updateProfile],
  );

  const setMarketing = useCallback(
    (granted: boolean) => updateProfile(marketingConsentPatch(granted, new Date())),
    [updateProfile],
  );

  return {
    analyticsEnabled: hasAnalyticsConsent(analyticsConsentAt),
    marketingEnabled: hasMarketingConsent(marketingConsentAt),
    setAnalytics,
    setMarketing,
  };
}
