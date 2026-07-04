import { cookies } from 'next/headers'
import { LOCALE_COOKIE_KEY, parseAppLocale, type AppLocale } from './locale'

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies()
  return parseAppLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value)
}
