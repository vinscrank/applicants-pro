'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../router'
import { billingApi, type PlanPublic } from '../billing/api'
import {
  BlurText,
  BRAND_INK,
  GradientText,
  SceneBackground,
  ScrollHero,
  ShinyText,
} from '@/components/react-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StaggerGroup } from '@/components/react-bits'
import { FeatureCard } from './components/FeatureCard'
import { LandingCta } from './components/LandingCta'
import { LightSection } from './components/LightSection'
import { PricingCard } from './components/PricingCard'
import { SectionHeader } from './components/SectionHeader'
import { StatCard } from './components/StatCard'

interface Props {
  showPricingOnly?: boolean
}

const FEATURE_ICONS = [
  (
    <svg key="tracker" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg key="search" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg key="star" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
]

const STAT_ICONS = [
  (
    <svg key="offers" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h10M4 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  (
    <svg key="ats" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="15" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  (
    <svg key="click" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 3l4 16 2.5-6.5L20 10 5 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
]

function GlassNav({ showPricingOnly }: { showPricingOnly?: boolean }) {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled

  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-[100] px-4 pt-4 sm:px-6">
      <nav
        className={cn(
          'mx-auto flex max-w-5xl items-center justify-between rounded-full px-3 py-2 pl-5 backdrop-blur-2xl transition-all duration-300',
          solid
            ? 'border border-border/60 bg-white/95 shadow-[0_10px_40px_rgba(26,31,54,0.1)]'
            : 'border border-white/10 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.25)]',
        )}
      >
        <button
          type="button"
          className={cn(
            'font-display text-base font-semibold tracking-tight',
            solid ? 'text-[#1a1f36]' : 'text-white',
          )}
          onClick={() => navigate({ page: 'landing' })}
        >
          {solid ? (
            <GradientText animationSpeed={12} colors={['#1a1f36', '#2d5a7b', '#4a8fb8', '#1a1f36']}>
              {t('landing.brand')}
            </GradientText>
          ) : (
            <ShinyText text={t('landing.brand')} color="rgba(255,255,255,0.92)" shineColor="rgba(255,255,255,1)" speed={6} delay={3} />
          )}
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          {!showPricingOnly && (
            <Button
              variant="ghost"
              className={cn(
                solid
                  ? 'text-foreground/75 hover:bg-muted hover:text-foreground'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
              onClick={() => navigate({ page: 'pricing' })}
            >
              {t('nav.pricing')}
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn(
              'hidden sm:inline-flex',
              solid
                ? 'text-foreground/75 hover:bg-muted hover:text-foreground'
                : 'text-white/80 hover:bg-white/10 hover:text-white',
            )}
            onClick={() => navigate({ page: 'login' })}
          >
            {t('nav.login')}
          </Button>
          <Button
            className={cn(
              'rounded-full px-5',
              solid
                ? 'bg-[#1a1f36] text-white hover:bg-[#2d5a7b]'
                : 'bg-white text-[var(--color-primary)] hover:bg-white/90',
            )}
            onClick={() => navigate({ page: 'register' })}
          >
            {t('nav.tryFree')}
          </Button>
        </div>
      </nav>
    </header>
  )
}

function HeroContent() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-4xl text-center text-white">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#7eb8d4] shadow-[0_0_12px_#7eb8d4]" />
        {t('landing.heroLabel')}
      </span>

      <h1 className="font-display text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
        <BlurText text={t('landing.heroTitleMain')} delay={55} className="text-white/95" />
      </h1>
      <p className="mt-3 font-display text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
        <GradientText animationSpeed={12}>{t('landing.heroTitleAccent')}</GradientText>
      </p>

      <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
        {t('landing.heroLead')}
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          className="h-12 rounded-full bg-white px-8 text-base text-[var(--color-primary)] hover:bg-white/92"
          onClick={() => navigate({ page: 'register' })}
        >
          {t('nav.startFree')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 rounded-full border-white/20 bg-white/5 px-8 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
          onClick={() => navigate({ page: 'pricing' })}
        >
          {t('landing.seePlans')}
        </Button>
      </div>
    </div>
  )
}

export function LandingPage({ showPricingOnly }: Props) {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<PlanPublic[]>([])

  useEffect(() => {
    billingApi.plans().then((data) => setPlans(data.plans)).catch(() => {})
  }, [])

  const features = [
    { title: t('landing.featureTrackerTitle'), desc: t('landing.featureTrackerDesc') },
    { title: t('landing.featureLiveTitle'), desc: t('landing.featureLiveDesc') },
    { title: t('landing.featureAutofillTitle'), desc: t('landing.featureAutofillDesc') },
  ]

  const stats = [
    { value: t('landing.statsOffersValue'), label: t('landing.statsOffersLabel'), accent: true },
    { value: t('landing.statsAtsValue'), label: t('landing.statsAtsLabel') },
    { value: t('landing.statsClickValue'), label: t('landing.statsClickLabel') },
  ] as const

  return (
    <div className="bg-background text-foreground">
      {!showPricingOnly ? (
        <>
          <GlassNav />
          <ScrollHero>
            <HeroContent />
          </ScrollHero>

          <LightSection id="stats" overlap className="pb-12 lg:pb-16">
            <SectionHeader eyebrow={t('landing.statsEyebrow')} title={t('landing.statsTitle')} />
            <StaggerGroup className="grid gap-5 sm:grid-cols-3 lg:gap-6" stagger={0.12}>
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  icon={STAT_ICONS[index]}
                  index={index}
                  accent={'accent' in stat ? stat.accent : false}
                />
              ))}
            </StaggerGroup>
          </LightSection>

          <LightSection id="features" divider className="py-14 sm:py-20 lg:py-24" grid={false}>
            <SectionHeader
              eyebrow={t('landing.featuresLabel')}
              title={t('landing.featuresTitle')}
              lead={t('landing.featuresLead')}
            />
            <StaggerGroup className="grid gap-6 md:grid-cols-3 lg:gap-8" stagger={0.16}>
              {features.map((feature, i) => (
                <FeatureCard
                  key={feature.title}
                  icon={FEATURE_ICONS[i]}
                  title={feature.title}
                  description={feature.desc}
                />
              ))}
            </StaggerGroup>
          </LightSection>
        </>
      ) : (
        <div className="relative overflow-hidden pb-8 pt-24 text-white" style={{ backgroundColor: BRAND_INK }}>
          <SceneBackground variant="hero" />
          <GlassNav showPricingOnly />
        </div>
      )}

      <LightSection
        id="pricing"
        divider={!showPricingOnly}
        className={showPricingOnly ? 'py-16 pt-12 lg:py-20' : 'py-14 sm:py-20 lg:py-24'}
        overlap={showPricingOnly}
        grid={false}
      >
        <SectionHeader
          eyebrow={t('landing.pricingLabel')}
          title={t('landing.pricingTitle')}
          lead={t('landing.pricingLead')}
        />
        <StaggerGroup className="grid gap-6 md:grid-cols-3 lg:gap-8" stagger={0.15}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              priceMonth={plan.price_eur_month}
              priceYear={plan.price_eur_year}
              highlights={plan.highlights}
              featured={plan.id === 'pro'}
              featuredLabel={t('landing.featuredPlan')}
              currencyLabel={t('landing.priceCurrency')}
              perMonthLabel={t('landing.pricePerMonth')}
              perYearLabel={(price) => t('landing.pricePerYear', { price })}
              ctaLabel={plan.id === 'free' ? t('landing.priceFree') : t('landing.priceChoose', { plan: plan.name })}
              onSelect={() => navigate({ page: 'register' })}
            />
          ))}
        </StaggerGroup>
      </LightSection>

      {!showPricingOnly && (
        <LightSection divider className="pb-20 pt-6 sm:pb-24 lg:pb-28" grid={false}>
          <LandingCta />
        </LightSection>
      )}
    </div>
  )
}
