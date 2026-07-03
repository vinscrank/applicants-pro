'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResourcesView } from '@/resources/ResourcesView'

function ResourcesContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const initialTab = tab === 'contacts' ? 'contacts' : 'documents'
  return <ResourcesView initialTab={initialTab} />
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={null}>
      <ResourcesContent />
    </Suspense>
  )
}
