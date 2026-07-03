import { BlurText } from '@/components/react-bits/BlurText'
import { FadeIn } from '@/components/react-bits/FadeIn'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  lead?: string
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeader({ eyebrow, title, lead, align = 'center', className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-14 sm:mb-16 lg:mb-20', align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow ? (
        <FadeIn>
          <span className="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </span>
        </FadeIn>
      ) : null}
      <FadeIn delay={0.05}>
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
          <BlurText text={title} delay={45} className="text-foreground" />
        </h2>
      </FadeIn>
      {lead ? (
        <FadeIn delay={0.12}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            {lead}
          </p>
        </FadeIn>
      ) : null}
    </div>
  )
}
