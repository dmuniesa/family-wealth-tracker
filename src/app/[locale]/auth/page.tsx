"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { useTranslations, useLocale } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password'

export default function AuthPage() {
  const t = useTranslations()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleLogin = () => {
    router.push(`/${locale}/dashboard`)
  }

  const handleRegister = () => {
    router.push(`/${locale}/dashboard`)
  }

  // Read URL params for reset-password flow
  useEffect(() => {
    const urlMode = searchParams.get('mode')
    const urlToken = searchParams.get('token')

    if (urlMode === 'reset-password' && urlToken) {
      setMode('reset-password')
      setResetToken(urlToken)
    }
  }, [searchParams])

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/auth/registration-status')
        if (response.ok) {
          const data = await response.json()
          console.log('Registration status:', data.enabled)
          setRegistrationEnabled(data.enabled || false)
        } else {
          console.log('Registration status check failed:', response.status)
        }
      } catch (error) {
        console.error('Failed to check registration status:', error)
        setRegistrationEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    checkRegistrationStatus()
  }, [])

  const handleLanguageChange = (newLocale: string) => {
    localStorage.setItem('preferred-locale', newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    window.location.href = `/${newLocale}/auth`
  }

  const handleResetSuccess = useCallback(() => {
    setMode('login')
  }, [])

  const handleInvalidToken = useCallback(() => {
    setMode('login')
  }, [])

  const renderAuthForm = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('common.loading')}</p>
        </div>
      )
    }

    switch (mode) {
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBackToLogin={() => setMode('login')}
          />
        )

      case 'reset-password':
        if (resetToken) {
          return (
            <ResetPasswordForm
              token={resetToken}
              onSuccess={handleResetSuccess}
              onInvalidToken={handleInvalidToken}
            />
          )
        }
        return (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm">
                {t('auth.invalidOrExpiredToken')}
              </div>
            </CardContent>
          </Card>
        )

      case 'register':
        if (registrationEnabled) {
          return (
            <RegisterForm
              onRegister={handleRegister}
              onSwitchToLogin={() => setMode('login')}
            />
          )
        }
        return (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => {}}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
            registrationEnabled={false}
          />
        )

      case 'login':
      default:
        return (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => registrationEnabled && setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
            registrationEnabled={registrationEnabled}
          />
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        {/* Logo and App Name */}
        <div className="text-center mb-2">
          <div className="flex justify-center mb-2">
            <img 
              src="/logo/logogray.png" 
              alt="Family Wealth Tracker Logo" 
              className="h-auto w-auto max-h-80"
            />
          </div>
          <p className="text-gray-600 mt-2">
            {t('auth.tagline')}
          </p>
        </div>

        {renderAuthForm()}

        {/* Language Selection */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-3">
            {t('auth.chooseLanguage')}
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant={locale === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLanguageChange('en')}
              className="flex items-center space-x-2"
            >
              <span className="text-lg">🇺🇸</span>
              <span>English</span>
            </Button>
            <Button
              variant={locale === 'es' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLanguageChange('es')}
              className="flex items-center space-x-2"
            >
              <span className="text-lg">🇪🇸</span>
              <span>Español</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}