'use client'

import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Aurora } from './Aurora'
import { BRAND_INK, AURORA_STOPS_DARK, BRAND_PETROL, BRAND_TIDE } from './brand'
import { NoiseGrain } from './NoiseGrain'
import { cn } from '@/lib/utils'

interface ScrollHeroProps {
  children: ReactNode
  className?: string
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const { t } = useTranslation()
  const opacity = useTransform(progress, [0, 0.15, 0.28], [1, 1, 0])

  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-2"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
        {t('landing.scrollHint')}
      </span>
      <motion.span
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="h-8 w-5 rounded-full border border-white/15"
      >
        <span className="mx-auto mt-1.5 block h-1 w-1 rounded-full bg-white/50" />
      </motion.span>
    </motion.div>
  )
}

export function ScrollHero({ children, className }: ScrollHeroProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end start'],
  })

  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 32, restDelta: 0.001 })

  const auroraY = useTransform(progress, [0, 1], ['0%', '-18%'])
  const tideY = useTransform(progress, [0, 1], ['72%', '18%'])
  const tideScale = useTransform(progress, [0, 0.55, 1], [0.55, 1, 1.15])
  const tideOpacity = useTransform(progress, [0, 0.25, 0.7, 1], [0.5, 0.85, 0.75, 0.35])
  const coreOpacity = useTransform(progress, [0, 0.4, 1], [0.35, 0.7, 0.55])

  const contentOpacity = useTransform(progress, [0, 0.38, 0.62], [1, 1, 0])
  const contentY = useTransform(progress, [0, 0.65], [0, -56])
  const vignette = useTransform(progress, [0, 0.5, 1], [0.35, 0.5, 0.65])

  return (
    <div ref={trackRef} className={cn('relative h-[115vh]', className)}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: BRAND_INK }} />

        <motion.div className="absolute inset-0" style={{ y: auroraY }}>
          <Aurora colorStops={AURORA_STOPS_DARK} amplitude={0.65} blend={0.42} speed={0.2} className="opacity-80" />
        </motion.div>

        <NoiseGrain opacity={0.045} />

        <motion.div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            opacity: vignette,
            background: 'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 30%, rgba(15,18,25,0.85) 100%)',
          }}
        />

        <motion.div
          className="pointer-events-none absolute left-1/2 z-[3] aspect-square w-[min(110vw,820px)] -translate-x-1/2"
          style={{ top: tideY, scale: tideScale, opacity: tideOpacity }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 42%, ${BRAND_TIDE}55 0%, ${BRAND_PETROL}33 32%, transparent 68%)`,
              filter: 'blur(2px)',
            }}
          />
          <motion.div
            className="absolute inset-[18%] rounded-full"
            style={{
              opacity: coreOpacity,
              background: `radial-gradient(circle, rgba(255,255,255,0.22) 0%, ${BRAND_TIDE}44 28%, transparent 62%)`,
              filter: 'blur(28px)',
            }}
          />
          <div
            className="absolute inset-x-[8%] top-[38%] h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${BRAND_TIDE}88, transparent)` }}
          />
        </motion.div>

        <motion.div
          className="pointer-events-none relative z-[15] flex h-full flex-col items-center justify-center px-4 pb-20 pt-28 sm:px-6"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="pointer-events-auto w-full max-w-4xl">{children}</div>
        </motion.div>

        <ScrollHint progress={progress} />
      </div>
    </div>
  )
}
