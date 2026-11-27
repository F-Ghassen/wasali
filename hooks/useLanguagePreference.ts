import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { track } from '@/services/analyticsService';

/** Languages the picker offers. Matches the profiles.preferred_locale check. */
export type AppLanguage = 'en' | 'fr';

/**
 * Changes the UI language on this device and, for signed-in users, saves it
 * to profiles.preferred_locale so it follows the account.
 */
export function useLanguagePreference(): {
  current: string;
  changeLanguage: (lang: AppLanguage) => Promise<void>;
} {
  const { i18n } = useTranslation();
  const profileId = useAuthStore((s) => s.profile?.id ?? null);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const changeLanguage = useCallback(
    async (lang: AppLanguage) => {
      const from = i18n.language;
      if (from === lang) return;

      await setLanguage(lang);
      track('language_changed', { from, to: lang });
      if (profileId) await updateProfile({ preferred_locale: lang });
    },
    [i18n.language, profileId, updateProfile],
  );

  return { current: i18n.language, changeLanguage };
}
