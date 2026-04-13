"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from 'next-intl'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const createResetPasswordSchema = (t: any) => z.object({
  newPassword: z.string().min(8, t('settings.passwordTooShort')),
  confirmPassword: z.string().min(1, t('forms.required')),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('auth.passwordsDoNotMatch'),
  path: ['confirmPassword'],
})

type ResetPasswordFormValues = {
  newPassword: string
  confirmPassword: string
}

interface ResetPasswordFormProps {
  token: string
  onSuccess: () => void
  onInvalidToken: () => void
}

export function ResetPasswordForm({ token, onSuccess, onInvalidToken }: ResetPasswordFormProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resetPasswordSchema = createResetPasswordSchema(t)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!data.valid) {
          onInvalidToken()
          return
        }
      } catch {
        onInvalidToken()
        return
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, onInvalidToken])

  async function onSubmit(values: ResetPasswordFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>
          {t('auth.resetPasswordDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.newPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.newPasswordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.confirmNewPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.confirmNewPasswordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.resettingPassword') : t('auth.resetPasswordButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}