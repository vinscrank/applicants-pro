'use client'

import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { AuthProvider } from '@/auth/AuthContext'
import { QuickAddProvider } from '@/contexts/QuickAddContext'
import { NavigationProvider } from '@/providers/NavigationProvider'
import { I18nHtmlLangSync } from '@/providers/I18nHtmlLangSync'
import { Toaster } from '@/components/ui/sonner'
import ApolloWrapper from '@/components/ApolloWrapper'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ApolloWrapper>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <NavigationProvider>
            <QuickAddProvider>
              <I18nHtmlLangSync />
              {children}
              <Toaster richColors closeButton position="top-right" />
            </QuickAddProvider>
          </NavigationProvider>
        </AuthProvider>
      </I18nextProvider>
    </ApolloWrapper>
  )
}
