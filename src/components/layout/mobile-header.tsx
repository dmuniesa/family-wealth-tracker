"use client"

import { Button } from "@/components/ui/button"
import { Menu, X, Users } from "lucide-react"
import { useTranslations } from 'next-intl'

interface MobileHeaderProps {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  pageTitle?: string
}

export function MobileHeader({ isMobileMenuOpen, setIsMobileMenuOpen, pageTitle }: MobileHeaderProps) {
  const t = useTranslations()

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 h-16">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-white shadow-sm tap-target"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              {t('navigation.familyWealth')}
            </span>
          </div>
        </div>
        
        {pageTitle && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {pageTitle}
          </h1>
        )}
      </div>
    </div>
  )
}