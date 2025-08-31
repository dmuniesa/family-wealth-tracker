"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { useTranslations, useLocale } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

export default function AuthPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [isLogin, setIsLogin] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleLogin = () => {
    router.push(`/${locale}/dashboard`)
  }

  const handleRegister = () => {
    router.push(`/${locale}/dashboard`)
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        {/* Logo and App Name */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('navigation.familyWealth')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('auth.tagline')}
          </p>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('common.loading')}</p>
          </div>
        ) : isLogin ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => registrationEnabled && setIsLogin(false)}
            registrationEnabled={registrationEnabled}
          />
        ) : registrationEnabled ? (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        ) : (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => {}}
            registrationEnabled={false}
          />
        )}

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