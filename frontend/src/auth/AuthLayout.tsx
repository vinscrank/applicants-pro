'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BlurText, FadeIn, GradientText, SceneBackground, ShinyText, SpotlightCard } from '@/components/react-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AuthVariant = 'login' | 'register' | 'forgot' | 'reset'

interface Props {
  variant: AuthVariant
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ variant, title, subtitle, children, footer }: Props) {
  const { t } = useTranslation()

  const heroCopy = {
    login: { badge: t('auth.welcomeBack'), headline: t('auth.heroLoginHeadline'), lead: t('auth.heroLoginLead') },
    register: { badge: t('auth.startFree'), headline: t('auth.heroRegisterHeadline'), lead: t('auth.heroRegisterLead') },
    forgot: { badge: t('auth.passwordRecovery'), headline: t('auth.heroForgotHeadline'), lead: t('auth.heroForgotLead') },
    reset: { badge: t('auth.accountSecurity'), headline: t('auth.heroResetHeadline'), lead: t('auth.heroResetLead') },
  }[variant]

  const features = [
    { title: t('auth.featureLiveTitle'), text: t('auth.featureLiveText') },
    { title: t('auth.featureTrackerTitle'), text: t('auth.featureTrackerText') },
    { title: t('auth.featureCompanionTitle'), text: t('auth.featureCompanionText') },
  ]

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:items-center lg:p-12 xl:p-16">
        <SceneBackground variant="auth" />
        <div className="relative z-10 max-w-md">
          <FadeIn>
            <div className="mb-10 inline-flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-display text-lg font-semibold backdrop-blur-md">
                A
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">
                <ShinyText text={t('common.brandName')} color="rgba(255,255,255,0.95)" shineColor="#ffffff" speed={7} delay={4} />
              </span>
            </div>
            <span className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              {heroCopy.badge}
            </span>
            <h2 className="font-display text-[clamp(2rem,3.2vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
              <BlurText text={heroCopy.headline} delay={50} className="text-white/95" />
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{heroCopy.lead}</p>
          </FadeIn>

          <ul className="mt-12 space-y-3">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={0.1 + i * 0.07}>
                <SpotlightCard tone="glass" className="p-4">
                  <div className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7eb8d4] shadow-[0_0_10px_rgba(126,184,212,0.6)]" />
                    <div>
                      <strong className="text-sm font-semibold">{feature.title}</strong>
                      <p className="mt-1 text-sm text-white/65">{feature.text}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </ul>

          <FadeIn delay={0.38} className="mt-12 flex gap-10 border-t border-white/10 pt-8">
            <div>
              <div className="font-display text-xl font-semibold">
                <GradientText animationSpeed={14}>{t('auth.statAtsValue')}</GradientText>
              </div>
              <div className="mt-1 text-xs text-white/50">{t('auth.statAtsLabel')}</div>
            </div>
            <div>
              <div className="font-display text-xl font-semibold">
                <GradientText animationSpeed={14}>{t('auth.statAiValue')}</GradientText>
              </div>
              <div className="mt-1 text-xs text-white/50">{t('auth.statAiLabel')}</div>
            </div>
          </FadeIn>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <SceneBackground variant="light" className="opacity-80" />
        <FadeIn className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-base font-semibold text-primary-foreground">
              A
            </span>
            <span className="font-display text-lg font-semibold">{t('common.brandName')}</span>
          </div>
          <SpotlightCard className="border-border/60 bg-card/95 p-8 shadow-[0_24px_80px_rgba(26,31,54,0.08)] backdrop-blur-xl">
            <div className="mb-7">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer ? <div className="mt-7 border-t border-border/60 pt-6">{footer}</div> : null}
          </SpotlightCard>
        </FadeIn>
      </main>
    </div>
  )
}

export function AuthSubmit({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
      {loading ? loadingLabel : label}
    </Button>
  )
}

export function passwordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  return Math.min(score, 4)
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordStrength(password)
  if (!password) return null
  return (
    <div className="flex gap-1" data-score={score} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full bg-muted transition-colors',
            i < score && score <= 1 && 'bg-[var(--danger)]',
            i < score && score === 2 && 'bg-[var(--warning)]',
            i < score && score >= 3 && 'bg-[var(--success)]',
          )}
        />
      ))}
    </div>
  )
}
