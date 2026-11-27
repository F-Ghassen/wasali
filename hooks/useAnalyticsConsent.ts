import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { identify, setConsent } from '@/services/analyticsService';
import { hasAnalyticsConsent } from '@/utils/consent';

/**
 * Keeps the analytics SDK in step with the consent stored on the profile.
 * Mount once, near the root, so consent is applied on every app start.
 * Writes live in useConsentSettings.
 */
export function useAnalyticsConsent(): void {
  const profileId = useAuthStore((s) => s.profile?.id ?? null);
  const analyticsConsentAt = useAuthStore((s) => s.profile?.analytics_consent_at ?? null);

  const enabled = hasAnalyticsConsent(analyticsConsentAt);

  useEffect(() => {
    void setConsent(enabled);
    if (enabled && profileId) identify(profileId);
  }, [enabled, profileId]);
}
