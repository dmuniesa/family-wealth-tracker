"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale } from "next-intl"

interface MonthNavigatorProps {
  month: string // YYYY-MM
  onChange: (month: string) => void
}

export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  const locale = useLocale()

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-").map(Number)
    const d = new Date(y, mo - 1, 1)
    return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
      month: "long",
      year: "numeric",
    })
  }

  const navigate = (direction: -1 | 1) => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1 + direction, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  return (
    <div className="flex items-center justify-center space-x-4">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-lg font-semibold min-w-[180px] text-center capitalize">
        {formatMonth(month)}
      </span>
      <button
        onClick={() => navigate(1)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
