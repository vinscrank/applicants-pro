'use client'

import { use } from 'react'
import { ApplicationDetailView } from '@/application/ApplicationDetailView'

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <ApplicationDetailView applicationId={Number(id)} />
}
