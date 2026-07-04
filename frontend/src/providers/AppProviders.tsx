'use client'

import { AuthProvider } from '@/auth/AuthContext'
import { QuickAddProvider } from '@/contexts/QuickAddContext'
import { NavigationProvider } from '@/providers/NavigationProvider'
import { I18nProvider } from '@/providers/I18nProvider'
import { Toaster } from '@/components/ui/sonner'
import ApolloWrapper from '@/components/ApolloWrapper'
import type { AppLocale } from '@/i18n/locale'

interface AppProvidersProps {
  children: React.ReactNode
  locale: AppLocale
}

export function AppProviders({ children, locale }: AppProvidersProps) {
  return (
    <I18nProvider locale={locale}>
      <ApolloWrapper>
        <AuthProvider>
          <NavigationProvider>
            <QuickAddProvider>
              {children}
              <Toaster richColors closeButton position="top-right" />
            </QuickAddProvider>
          </NavigationProvider>
        </AuthProvider>
      </ApolloWrapper>
    </I18nProvider>
  )
}
