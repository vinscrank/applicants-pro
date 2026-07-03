'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/auth/api'
import { AuthLayout, AuthSubmit, PasswordStrengthBar } from '@/auth/AuthLayout'
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
  token: string
  onDone: () => void
}

export function ResetPasswordForm({ token, onDone }: Props) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('auth.passwordHint')),
          confirmPassword: z.string().min(8, t('auth.passwordHint')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          path: ['confirmPassword'],
          message: t('auth.passwordMismatch'),
        }),
    [t],
  )

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const password = form.watch('password')

  const submit = async (values: z.infer<typeof schema>) => {
    try {
      await authApi.resetPassword(token, values.password)
      onDone()
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('auth.resetError'),
      })
    }
  }

  return (
    <AuthLayout variant="reset" title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          {form.formState.errors.root ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.newPassword')}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
                <PasswordStrengthBar password={password} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <AuthSubmit
            loading={form.formState.isSubmitting}
            label={t('auth.resetSubmit')}
            loadingLabel={t('common.saving')}
          />
        </form>
      </Form>
    </AuthLayout>
  )
}
