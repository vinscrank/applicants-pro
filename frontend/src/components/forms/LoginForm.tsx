'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthContext'
import { AuthLayout, AuthSubmit } from '@/auth/AuthLayout'
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth'
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
  onNavigate: (page: 'login' | 'register' | 'forgot-password') => void
}

export function LoginForm({ onNavigate }: Props) {
  const { t } = useTranslation()
  const { login } = useAuth()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password)
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('auth.loginError'),
      })
    }
  }

  return (
    <AuthLayout
      variant="login"
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <div className="flex flex-wrap gap-4 text-sm">
          <button type="button" className="text-primary hover:underline" onClick={() => onNavigate('register')}>
            {t('auth.createAccount')}
          </button>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onNavigate('forgot-password')}>
            {t('auth.forgotPassword')}
          </button>
        </div>
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
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <AuthSubmit
            loading={form.formState.isSubmitting}
            label={t('auth.loginSubmit')}
            loadingLabel={t('auth.loginSubmitting')}
          />
        </form>
      </Form>
    </AuthLayout>
  )
}
