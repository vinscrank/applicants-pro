export {
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  parseAppLocale,
  type AppLocale,
} from './locale'

export {
  bootstrapAppLocale,
  ensureI18n,
  resolveClientLocale,
  setAppLocale,
} from './client'

export { default } from './client'
