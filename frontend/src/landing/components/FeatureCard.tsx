'use client'

import type { ReactNode } from 'react'
import { SpotlightCard } from '@/components/react-bits/SpotlightCard'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <SpotlightCard className="flex h-full min-h-[15rem] flex-col bg-white p-8 sm:p-9 lg:min-h-[16rem]">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.06] text-primary">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 flex-1 text-base leading-relaxed text-muted-foreground">{description}</p>
    </SpotlightCard>
  )
}
