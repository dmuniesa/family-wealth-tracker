"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CalendarDays, Receipt } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import type { MonthlySummary } from "@/types"

interface OverviewTabProps {
  summary: MonthlySummary | null
}

export function OverviewTab({ summary }: OverviewTabProps) {
  const t = useTranslations("analytics")
  const locale = useLocale()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  if (!summary) return null

  const [y, m] = summary.month.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const savingsRate = summary.totalIncome > 0
    ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100
    : 0
  const avgDailySpend = daysInMonth > 0 ? summary.totalExpenses / daysInMonth : 0
  const transactionCount = summary.byCategory.reduce((s, c) => s + c.count, 0)

  const metrics = [
    {
      label: t("income"),
      value: formatCurrency(summary.totalIncome),
      icon: TrendingUp,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
    {
      label: t("expenses"),
      value: formatCurrency(summary.totalExpenses),
      icon: TrendingDown,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      valueColor: "text-red-600",
    },
    {
      label: t("savings"),
      value: formatCurrency(summary.netAmount),
      icon: Wallet,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: summary.netAmount >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: t("savingsRate"),
      value: `${savingsRate.toFixed(1)}%`,
      icon: PiggyBank,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      valueColor: savingsRate >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: t("avgDailySpend"),
      value: formatCurrency(avgDailySpend),
      icon: CalendarDays,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      valueColor: "text-orange-600",
    },
    {
      label: t("transactionCount"),
      value: String(transactionCount),
      icon: Receipt,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      valueColor: "text-gray-900",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-4 flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-full ${metric.bgColor} flex items-center justify-center flex-shrink-0`}>
              <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{metric.label}</p>
              <p className={`text-xl font-bold ${metric.valueColor} truncate`}>{metric.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
