"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import type { User } from '@/types'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            if (data.user.role !== 'administrator') {
              // Redirect non-administrators to dashboard
              router.push(`/${locale}/dashboard`)
              return
            }
            setUser(data.user)
          } else {
            router.push(`/${locale}/auth`)
            return
          }
        } else {
          router.push(`/${locale}/auth`)
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push(`/${locale}/auth`)
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, locale])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}