'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthContext'
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
  onNavigate: (page: 'login') => void
}

export function RegisterForm({ onNavigate }: Props) {
  const { t } = useTranslation()
  const { register } = useAuth()

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t('validation.email')),
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
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const password = form.watch('password')

  const submit = async (values: z.infer<typeof schema>) => {
    try {
      await register(values.email, values.password)
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('auth.registerError'),
      })
    }
  }

  return (
    <AuthLayout
      variant="register"
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => onNavigate('login')}>
          {t('auth.hasAccount')}
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.password')}</FormLabel>
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
            label={t('auth.registerSubmit')}
            loadingLabel={t('auth.registerSubmitting')}
          />
        </form>
      </Form>
    </AuthLayout>
  )
}
