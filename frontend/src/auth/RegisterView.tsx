'use client'

import { RegisterForm } from '@/components/forms/RegisterForm'

interface Props {
  onNavigate: (page: 'login') => void
}

export function RegisterView({ onNavigate }: Props) {
  return <RegisterForm onNavigate={onNavigate} />
}
