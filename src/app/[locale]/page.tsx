"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export default function LocalePage() {
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          // User is authenticated, redirect to dashboard
          router.push(`/${locale}/dashboard`)
        } else {
          // User is not authenticated, redirect to auth
          router.push(`/${locale}/auth`)
        }
      } catch (error) {
        // If auth check fails, redirect to auth
        console.log('Auth check failed:', error)
        router.push(`/${locale}/auth`)
      }
    }

    checkAuthAndRedirect()
  }, [router, locale])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
