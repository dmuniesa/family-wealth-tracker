"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations, useLocale } from "next-intl"

interface CategoryDrilldownProps {
  category: {
    categoryId: number
    categoryName: string
    categoryColor: string
    categoryIcon: string
    amount: number
    count: number
    type: string
  }
  totalExpenses: number
}

export function CategoryDrilldown({ category, totalExpenses }: CategoryDrilldownProps) {
  const t = useTranslations("analytics")
  const locale = useLocale()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const pct = totalExpenses > 0 ? (Math.abs(category.amount) / totalExpenses) * 100 : 0
  const avgPerTransaction = category.count > 0 ? Math.abs(category.amount) / category.count : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.categoryColor || "#9CA3AF" }}
          />
          <CardTitle>{t("drilldownTitle")}: {category.categoryName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t("amount")}</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(Math.abs(category.amount))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("percentage")}</p>
            <p className="text-lg font-bold text-gray-900">{pct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("count")}</p>
            <p className="text-lg font-bold text-gray-900">{category.count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("avgPerTransaction")}</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(avgPerTransaction)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
