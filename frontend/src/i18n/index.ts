import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import it from './locales/it.json'

export const LOCALE_STORAGE_KEY = 'candidature_locale'
export const SUPPORTED_LOCALES = ['en', 'it'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'en' || stored === 'it') return stored
  } catch {
  }
  return 'en'
}

const i18n = createInstance()

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: readStoredLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setAppLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  void i18n.changeLanguage(locale)
}

export default i18n
