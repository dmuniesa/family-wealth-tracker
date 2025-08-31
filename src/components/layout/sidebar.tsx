"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  Users,
  Menu,
  X,
  Shield
} from "lucide-react"
import { useTranslations, useLocale } from 'next-intl'
import type { User } from "@/types"

interface SidebarProps {
  user: User
  onLogout: () => void
  isMobileMenuOpen?: boolean
  setIsMobileMenuOpen?: (open: boolean) => void
}

export function Sidebar({ user, onLogout, isMobileMenuOpen: externalMobileMenuOpen, setIsMobileMenuOpen: externalSetMobileMenuOpen }: SidebarProps) {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  
  const isMobileMenuOpen = externalMobileMenuOpen ?? internalMobileMenuOpen
  const setIsMobileMenuOpen = externalSetMobileMenuOpen ?? setInternalMobileMenuOpen
  
  const navigation = [
    {
      name: t('navigation.dashboard'),
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: t('navigation.accounts'),
      href: `/${locale}/accounts`,
      icon: Wallet,
    },
    {
      name: t('navigation.history'),
      href: `/${locale}/history`,
      icon: History,
    },
    {
      name: t('navigation.backups'),
      href: `/${locale}/backups`,
      icon: Shield,
    },
    {
      name: t('navigation.members'),
      href: `/${locale}/members`,
      icon: Users,
    },
    {
      name: t('navigation.settings'),
      href: `/${locale}/settings`,
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "flex h-full w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out shadow-lg",
        "lg:translate-x-0 lg:shadow-none",
        isMobileMenuOpen ? "fixed z-50 translate-x-0" : "fixed -translate-x-full lg:relative lg:translate-x-0"
      )}>
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold">{t('navigation.familyWealth')}</span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col justify-between">
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "group flex items-center px-3 py-2 rounded-md text-sm font-medium touch-manipulation",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-gray-900" : "text-gray-400"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Family ID: {user?.family_id}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('navigation.signOut')}
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}