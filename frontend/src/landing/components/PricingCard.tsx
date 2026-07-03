'use client'

import { SpotlightCard } from '@/components/react-bits/SpotlightCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PricingCardProps {
  name: string
  priceMonth: number
  priceYear: number
  highlights: string[]
  featured?: boolean
  featuredLabel: string
  currencyLabel: string
  perMonthLabel: string
  perYearLabel: (price: number) => string
  ctaLabel: string
  onSelect: () => void
}

export function PricingCard({
  name,
  priceMonth,
  priceYear,
  highlights,
  featured = false,
  featuredLabel,
  currencyLabel,
  perMonthLabel,
  perYearLabel,
  ctaLabel,
  onSelect,
}: PricingCardProps) {
  return (
    <SpotlightCard
      className={cn(
        'flex h-full min-h-[22rem] flex-col bg-white p-8 sm:p-9',
        featured && 'border-primary/25 shadow-[0_16px_48px_rgba(45,90,123,0.1)] ring-1 ring-primary/10',
      )}
    >
      {featured ? (
        <span className="mb-5 inline-block w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
          {featuredLabel}
        </span>
      ) : (
        <span className="mb-5 block h-6" aria-hidden />
      )}
      <div className="font-display text-lg font-semibold">{name}</div>
      <div className="mt-5 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-[2.5rem]">
        {priceMonth === 0 ? '0' : priceMonth.toFixed(0)}
        <span className="text-base font-normal text-muted-foreground">
          {' '}
          {currencyLabel}
          {priceMonth > 0 ? perMonthLabel : ''}
        </span>
      </div>
      {priceYear > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{perYearLabel(priceYear)}</p>
      ) : (
        <p className="mt-2 h-5" aria-hidden />
      )}
      <ul className="mt-8 flex-1 space-y-3.5 border-t border-border/60 pt-7 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {highlights.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-10 w-full rounded-full" variant={featured ? 'default' : 'outline'} onClick={onSelect}>
        {ctaLabel}
      </Button>
    </SpotlightCard>
  )
}
