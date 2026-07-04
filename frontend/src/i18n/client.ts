import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import it from './locales/it.json'
import { LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, parseAppLocale, type AppLocale } from './locale'

const i18n = createInstance()

function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

function readStoredLocale(): AppLocale {
  try {
    return parseAppLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

export function ensureI18n(locale: AppLocale): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        it: { translation: it },
      },
      lng: locale,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      initAsync: false,
    })
    return i18n
  }
  if (i18n.language !== locale) {
    i18n.language = locale
    i18n.resolvedLanguage = locale
    i18n.languages = [locale, 'en']
  }
  return i18n
}

export function resolveClientLocale(serverLocale: AppLocale): AppLocale {
  if (serverLocale !== 'en') return serverLocale
  const stored = readStoredLocale()
  return stored !== 'en' ? stored : serverLocale
}

export function bootstrapAppLocale(serverLocale: AppLocale) {
  const locale = resolveClientLocale(serverLocale)
  writeLocaleCookie(locale)
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  if (locale !== i18n.language) {
    void i18n.changeLanguage(locale)
  }
  document.documentElement.lang = locale
}

export function setAppLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  writeLocaleCookie(locale)
  document.documentElement.lang = locale
  void i18n.changeLanguage(locale)
}

export type { AppLocale } from './locale'

export default i18n
