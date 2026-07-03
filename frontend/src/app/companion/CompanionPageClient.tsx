'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ApplyCompanion } from '@/apply/ApplyCompanion'

export function CompanionPageClient() {
  const router = useRouter()

  useEffect(() => {
    if (!window.opener) {
      router.replace('/discover')
    }
  }, [router])

  return <ApplyCompanion />
}
