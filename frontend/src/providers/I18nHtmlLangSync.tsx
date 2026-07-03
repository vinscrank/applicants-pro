'use client'

import { useEffect } from 'react'
import i18n from '@/i18n'

export function I18nHtmlLangSync() {
  useEffect(() => {
    const sync = (locale: string) => {
      document.documentElement.lang = locale
    }
    sync(i18n.language)
    i18n.on('languageChanged', sync)
    return () => {
      i18n.off('languageChanged', sync)
    }
  }, [])

  return null
}
