'use client'

import { useRef, useState, type PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps extends PropsWithChildren {
  className?: string
  spotlightColor?: string
  tone?: 'light' | 'dark' | 'glass'
}

const toneStyles = {
  light: 'border-border/60 bg-white shadow-[0_1px_2px_rgba(26,31,54,0.04)]',
  dark: 'border-white/10 bg-white/[0.06] text-white shadow-none backdrop-blur-md',
  glass: 'border-white/20 bg-white/10 text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl',
}

export function SpotlightCard({
  children,
  className,
  spotlightColor,
  tone = 'light',
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const resolvedSpotlight =
    spotlightColor ??
    (tone === 'dark' || tone === 'glass' ? 'rgba(126, 184, 212, 0.18)' : 'rgba(45, 90, 123, 0.16)')

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(0.85)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        toneStyles[tone],
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity,
          background: `radial-gradient(520px circle at ${position.x}px ${position.y}px, ${resolvedSpotlight}, transparent 68%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
