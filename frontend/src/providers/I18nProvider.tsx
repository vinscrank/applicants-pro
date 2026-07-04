'use client'

import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { bootstrapAppLocale, ensureI18n, type AppLocale } from '@/i18n/client'

interface I18nProviderProps {
  locale: AppLocale
  children: React.ReactNode
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  ensureI18n(locale)

  useEffect(() => {
    bootstrapAppLocale(locale)
    const sync = (nextLocale: string) => {
      document.documentElement.lang = nextLocale
    }
    i18n.on('languageChanged', sync)
    return () => {
      i18n.off('languageChanged', sync)
    }
  }, [locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
