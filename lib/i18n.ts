import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/locales/en';
import fr from '@/locales/fr';

const LANG_KEY = '@wasali_lang';

export async function initI18n() {
  const stored = await AsyncStorage.getItem(LANG_KEY);
  await i18n.use(initReactI18next).init({
    lng: stored ?? 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(lang: 'en' | 'fr') {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export default i18n;
