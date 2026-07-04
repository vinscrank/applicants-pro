export const LOCALE_STORAGE_KEY = 'candidature_locale'
export const LOCALE_COOKIE_KEY = 'candidature_locale'
export const SUPPORTED_LOCALES = ['en', 'it'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export function parseAppLocale(value: string | null | undefined): AppLocale {
  if (value === 'it' || value === 'en') return value
  return 'en'
}
