'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm'
import { navigate } from '@/router'
import { AuthGuard } from '@/components/shell/AuthGuard'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  return (
          <ResetPasswordForm token={token} onDone={() => navigate({ page: 'candidature' }, true)} />
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <ResetPasswordContent />
      </Suspense>
    </AuthGuard>
  )
}
