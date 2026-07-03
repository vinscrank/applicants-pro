'use client'

import { LoginForm } from '@/components/forms/LoginForm'

interface Props {
  onNavigate: (page: 'login' | 'register' | 'forgot-password') => void
}

export function LoginView({ onNavigate }: Props) {
  return <LoginForm onNavigate={onNavigate} />
}
