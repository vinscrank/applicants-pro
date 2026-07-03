'use client'

import { cn } from '@/lib/utils'

interface MeshBackgroundProps {
  className?: string
  variant?: 'light' | 'dark'
}

export function MeshBackground({ className, variant = 'light' }: MeshBackgroundProps) {
  const isDark = variant === 'dark'

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className={cn(
          'absolute -left-[20%] -top-[30%] h-[55%] w-[55%] rounded-full blur-3xl',
          isDark ? 'bg-[#2d5a7b]/35' : 'bg-[#2d5a7b]/10',
        )}
        style={{ animation: 'mesh-drift-a 18s ease-in-out infinite alternate' }}
      />
      <div
        className={cn(
          'absolute -right-[15%] top-[10%] h-[45%] w-[45%] rounded-full blur-3xl',
          isDark ? 'bg-[#1a1f36]/50' : 'bg-[#1a1f36]/6',
        )}
        style={{ animation: 'mesh-drift-b 22s ease-in-out infinite alternate' }}
      />
      <div
        className={cn(
          'absolute bottom-[-20%] left-[25%] h-[50%] w-[50%] rounded-full blur-3xl',
          isDark ? 'bg-[#3d7a9e]/25' : 'bg-[#3d7a9e]/8',
        )}
        style={{ animation: 'mesh-drift-c 20s ease-in-out infinite alternate' }}
      />
      <div
        className={cn(
          'absolute inset-0 opacity-[0.35]',
          isDark ? 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)]' : 'bg-[radial-gradient(circle_at_1px_1px,rgba(26,31,54,0.07)_1px,transparent_0)]',
        )}
        style={{ backgroundSize: '28px 28px' }}
      />
    </div>
  )
}
