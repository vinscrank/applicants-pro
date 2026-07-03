import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import '@/index.css'
import '@/app/globals.css'
import '@/layout/platform-ui.css'
import { AppProviders } from '@/providers/AppProviders'
import { HashRedirect } from '@/components/shell/HashRedirect'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <AppProviders>
          <HashRedirect />
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
