'use client'

import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm'

interface Props {
  token: string
  onDone: () => void
}

export function ResetPasswordView({ token, onDone }: Props) {
  return <ResetPasswordForm token={token} onDone={onDone} />
}
