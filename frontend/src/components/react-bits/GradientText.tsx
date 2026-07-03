'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

interface GradientTextProps {
  children: ReactNode
  className?: string
  colors?: readonly string[]
  animationSpeed?: number
  direction?: 'horizontal' | 'vertical'
  pauseOnHover?: boolean
}

export function GradientText({
  children,
  className,
  colors = ['#2d5a7b', '#4a8fb8', '#7eb8d4', '#2d5a7b'],
  animationSpeed = 10,
  direction = 'horizontal',
  pauseOnHover = false,
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false)
  const progress = useMotionValue(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const animationDuration = animationSpeed * 1000

  useAnimationFrame((time) => {
    if (isPaused) {
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

    const fullCycle = animationDuration * 2
    const cycleTime = elapsedRef.current % fullCycle
    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100)
    } else {
      progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100)
    }
  })

  useEffect(() => {
    elapsedRef.current = 0
    progress.set(0)
  }, [animationSpeed, progress])

  const backgroundPosition = useTransform(progress, (p) =>
    direction === 'horizontal' ? `${p}% 50%` : `50% ${p}%`,
  )

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true)
  }, [pauseOnHover])

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false)
  }, [pauseOnHover])

  const gradientAngle = direction === 'horizontal' ? 'to right' : 'to bottom'
  const gradientColors = [...colors, colors[0]].join(', ')
  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize: direction === 'horizontal' ? '300% 100%' : '100% 300%',
    backgroundRepeat: 'repeat' as const,
  }

  return (
    <motion.span
      className={cn('inline-block bg-clip-text text-transparent', className)}
      style={{ ...gradientStyle, backgroundPosition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.span>
  )
}
