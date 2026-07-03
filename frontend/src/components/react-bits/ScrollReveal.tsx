'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  blurStrength?: number
  as?: 'div' | 'section' | 'h2' | 'p'
}

export function ScrollReveal({ children, className, blurStrength = 6, as: Tag = 'div' }: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null)

  const text = typeof children === 'string' ? children : null
  const words = useMemo(() => {
    if (!text) return null
    return text.split(/(\s+)/).map((word, index) => {
      if (/^\s+$/.test(word)) return word
      return (
        <span key={`${word}-${index}`} className="scroll-reveal-word inline-block">
          {word}
        </span>
      )
    })
  }, [text])

  useEffect(() => {
    const el = ref.current
    if (!el || !text) return

    const wordEls = el.querySelectorAll('.scroll-reveal-word')
    const ctx = gsap.context(() => {
      gsap.fromTo(
        wordEls,
        { opacity: 0.12, y: 28, filter: `blur(${blurStrength}px)` },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            end: 'top 52%',
            scrub: 0.6,
          },
        },
      )
    }, el)

    return () => ctx.revert()
  }, [text, blurStrength])

  if (!text) {
    return (
      <Tag ref={ref as never} className={cn('scroll-reveal-block', className)}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag ref={ref as never} className={cn('scroll-reveal-block', className)}>
      {words}
    </Tag>
  )
}
