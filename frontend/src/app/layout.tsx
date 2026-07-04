import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import '@/index.css'
import '@/app/globals.css'
import '@/layout/platform-ui.css'
import { AppProviders } from '@/providers/AppProviders'
import { HashRedirect } from '@/components/shell/HashRedirect'
import { getRequestLocale } from '@/i18n/request-locale'
import en from '@/i18n/locales/en.json'
import it from '@/i18n/locales/it.json'

const LOCALE_MESSAGES = { en, it } as const

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const messages = LOCALE_MESSAGES[locale]
  return {
    title: messages.common.brandName,
    description: messages.common.metaDescription,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale()

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <AppProviders locale={locale}>
          <HashRedirect />
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
