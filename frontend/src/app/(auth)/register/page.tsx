'use client'

import { RegisterView } from '@/auth/RegisterView'
import { navigate } from '@/router'
import { AuthGuard } from '@/components/shell/AuthGuard'

export default function RegisterPage() {
  return (
    <AuthGuard>
      <RegisterView onNavigate={(page) => navigate({ page })} />
    </AuthGuard>
  )
}
