'use client'

import type { ReactNode } from 'react'
import { GradientText } from '@/components/react-bits/GradientText'
import { SpotlightCard } from '@/components/react-bits/SpotlightCard'
import { cn } from '@/lib/utils'

interface StatCardProps {
  value: string
  label: string
  icon: ReactNode
  index?: number
  accent?: boolean
  className?: string
}

export function StatCard({ value, label, icon, index = 0, accent = false, className }: StatCardProps) {
  return (
    <SpotlightCard
      className={cn(
        'group/stat relative flex min-h-[14rem] flex-col justify-between overflow-hidden border-white/80 bg-gradient-to-br from-white via-white to-[#f3f8fb] p-7 shadow-[0_18px_50px_rgba(26,31,54,0.06)] sm:min-h-[15rem] sm:p-8',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br from-[#7eb8d4]/20 via-[#4a8fb8]/10 to-transparent blur-2xl transition-transform duration-700 group-hover/stat:scale-110"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#4a8fb8]/35 to-transparent"
      />

      <div className="relative z-[1] flex items-start justify-between gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4a8fb8]/15 bg-gradient-to-br from-[#2d5a7b]/[0.07] to-[#7eb8d4]/10 text-[#2d5a7b] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          {icon}
        </div>
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-[#4a8fb8]/55">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="relative z-[1] mt-8">
        <div className="font-display text-[clamp(2.35rem,5vw,3.35rem)] font-semibold leading-none tracking-[-0.03em]">
          <GradientText
            animationSpeed={accent ? 9 : 13}
            colors={
              accent
                ? ['#2d5a7b', '#4a8fb8', '#7eb8d4', '#2d5a7b']
                : ['#1a1f36', '#2d5a7b', '#4a8fb8', '#1a1f36']
            }
          >
            {value}
          </GradientText>
        </div>
        <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">{label}</p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2d5a7b]/20 to-transparent"
      />
    </SpotlightCard>
  )
}
