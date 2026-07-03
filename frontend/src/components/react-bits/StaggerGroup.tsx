'use client'

import { motion, useInView } from 'motion/react'
import { Children, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  stagger?: number
}

const itemVariants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function StaggerGroup({ children, className, stagger = 0.14 }: StaggerGroupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-6% 0px' })

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {Children.toArray(children).map((child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
