import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwordMismatch',
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwordMismatch',
  })

export const quickAddUrlSchema = z.object({
  jobUrl: z.string().url(),
})

export const quickAddManualSchema = z.object({
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  manualUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['saved', 'applied']),
  priority: z.enum(['low', 'medium', 'high']),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type QuickAddUrlFormValues = z.infer<typeof quickAddUrlSchema>
export type QuickAddManualFormValues = z.infer<typeof quickAddManualSchema>
