import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import '@/index.css'
import '@/app/globals.css'
import '@/layout/platform-ui.css'
import { AppProviders } from '@/providers/AppProviders'
import { HashRedirect } from '@/components/shell/HashRedirect'
import { getRequestLocale } from '@/i18n/request-locale'

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

export const metadata: Metadata = {
  title: 'Candidature',
  description: 'Tracker candidature e ricerca lavoro intelligente',
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
