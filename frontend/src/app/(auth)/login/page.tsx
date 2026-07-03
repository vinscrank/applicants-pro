'use client'

import { LoginView } from '@/auth/LoginView'
import { navigate } from '@/router'
import { AuthGuard } from '@/components/shell/AuthGuard'

export default function LoginPage() {
  return (
    <AuthGuard>
      <LoginView onNavigate={(page) => navigate({ page })} />
    </AuthGuard>
  )
}
