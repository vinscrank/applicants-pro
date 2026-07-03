'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/auth/api'
import { AuthLayout, AuthSubmit } from '@/auth/AuthLayout'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

interface Props {
  onNavigate: (page: 'login') => void
}

export function ForgotPasswordForm({ onNavigate }: Props) {
  const { t } = useTranslation()
  const [message, setMessage] = useState<string | null>(null)
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.email')),
      }),
    [t],
  )

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const submit = async (values: z.infer<typeof schema>) => {
    setMessage(null)
    setResetUrl(null)
    try {
      const data = await authApi.forgotPassword(values.email)
      setMessage(data.message)
      if (data.reset_url) setResetUrl(data.reset_url)
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('auth.forgotError'),
      })
    }
  }

  return (
    <AuthLayout
      variant="forgot"
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => onNavigate('login')}>
          {t('auth.backToLogin')}
        </button>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          {form.formState.errors.root ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-md border border-[var(--success)]/30 bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]">
              {message}
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.email')}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <AuthSubmit
            loading={form.formState.isSubmitting}
            label={t('auth.forgotSubmit')}
            loadingLabel={t('auth.forgotSubmitting')}
          />
        </form>
      </Form>
      {resetUrl ? (
        <div className="mt-4 break-all text-xs text-muted-foreground">
          Dev: <a className="text-primary hover:underline" href={resetUrl}>{resetUrl}</a>
        </div>
      ) : null}
    </AuthLayout>
  )
}
