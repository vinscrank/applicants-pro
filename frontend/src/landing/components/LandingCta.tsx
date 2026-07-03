'use client'

import { useTranslation } from 'react-i18next'
import { navigate } from '@/router'
import { BlurText } from '@/components/react-bits/BlurText'
import { FadeIn } from '@/components/react-bits/FadeIn'
import { SpotlightCard } from '@/components/react-bits/SpotlightCard'
import { Button } from '@/components/ui/button'

export function LandingCta() {
  const { t } = useTranslation()

  return (
    <FadeIn>
      <SpotlightCard className="overflow-hidden bg-white px-8 py-12 sm:px-12 sm:py-14 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(45,90,123,0.06),transparent_55%)]" />
        <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              <BlurText text={t('landing.ctaTitle')} delay={40} className="text-foreground" />
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{t('landing.ctaLead')}</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" className="h-12 rounded-full px-8" onClick={() => navigate({ page: 'register' })}>
              {t('nav.startFree')}
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full px-8" onClick={() => navigate({ page: 'login' })}>
              {t('nav.login')}
            </Button>
          </div>
        </div>
      </SpotlightCard>
    </FadeIn>
  )
}
