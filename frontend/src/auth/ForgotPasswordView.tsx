'use client'

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

interface Props {
  onNavigate: (page: 'login') => void
}

export function ForgotPasswordView({ onNavigate }: Props) {
  return <ForgotPasswordForm onNavigate={onNavigate} />
}
