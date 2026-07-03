'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  delay?: number
}

export function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className,
  color = 'currentColor',
  shineColor = 'rgba(255,255,255,0.85)',
  spread = 100,
  delay = 2,
}: ShinyTextProps) {
  const [isPaused, setIsPaused] = useState(false)
  const progress = useMotionValue(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const animationDuration = speed * 1000
  const delayDuration = delay * 1000

  useAnimationFrame((time) => {
    if (disabled || isPaused) {
      lastTimeRef.current = null
      return
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }
    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time
    elapsedRef.current += deltaTime

    const cycleDuration = animationDuration + delayDuration
    const cycleTime = elapsedRef.current % cycleDuration

    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100)
    } else {
      progress.set(100)
    }
  })

  useEffect(() => {
    elapsedRef.current = 0
    progress.set(0)
  }, [speed, delay, progress])

  const backgroundPosition = useTransform(progress, (p) => `${150 - p * 2}% center`)

  const handleMouseEnter = useCallback(() => setIsPaused(true), [])
  const handleMouseLeave = useCallback(() => setIsPaused(false), [])

  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 38%, ${shineColor} 50%, ${color} 62%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }

  return (
    <motion.span
      className={cn('inline-block', className)}
      style={{ ...gradientStyle, backgroundPosition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {text}
    </motion.span>
  )
}
