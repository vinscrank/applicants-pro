'use client'

import { ForgotPasswordView } from '@/auth/ForgotPasswordView'
import { navigate } from '@/router'
import { AuthGuard } from '@/components/shell/AuthGuard'

export default function ForgotPasswordPage() {
  return (
    <AuthGuard>
      <ForgotPasswordView onNavigate={(page) => navigate({ page })} />
    </AuthGuard>
  )
}
