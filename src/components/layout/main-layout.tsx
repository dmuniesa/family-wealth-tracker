"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { MobileHeader } from "./mobile-header"
import { useLocale, useTranslations } from 'next-intl'
import type { User } from "@/types"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const t = useTranslations()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return t('navigation.dashboard')
    if (pathname.includes('/accounts')) return t('navigation.accounts')
    if (pathname.includes('/history')) return t('navigation.history')
    if (pathname.includes('/settings')) return t('navigation.settings')
    return ''
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          router.push(`/${locale}/auth`)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push(`/${locale}/auth`)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, locale])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(`/${locale}/auth`)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <MobileHeader 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        pageTitle={getPageTitle()}
      />
      <Sidebar 
        user={user} 
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <main 
        className="flex-1 overflow-auto lg:ml-0"
        onClick={() => {
          if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false)
          }
        }}
      >
        <div className="p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}