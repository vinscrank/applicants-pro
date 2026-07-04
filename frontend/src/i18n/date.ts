import i18n from './client'

export function appDateLocale(): string {
  return i18n.language === 'it' ? 'it-IT' : 'en-US'
}

export function formatAppDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(appDateLocale(), options)
}
