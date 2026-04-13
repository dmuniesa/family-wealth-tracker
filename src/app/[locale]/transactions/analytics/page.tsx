"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import type { MonthlySummary } from "@/types"

export default function AnalyticsPage() {
  const t = useTranslations()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/transactions/analytics/monthly?month=${month}`)
        if (res.ok) {
          setSummary(await res.json())
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [month])

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1 + direction, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  const totalExpenses = summary?.byCategory
    .filter(c => c.amount < 0 && c.type !== "non_computable")
    .reduce((sum, c) => sum + Math.abs(c.amount), 0) || 0

  if (loading && !summary) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("transactions.analytics")}</h1>
              <p className="text-gray-600">{t("transactions.analyticsSubtitle")}</p>
            </div>
          </div>

          {/* Month navigator */}
          <div className="flex items-center justify-center space-x-4">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold min-w-[160px] text-center">{month}</span>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-full hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("transactions.income")}</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("transactions.expenses")}</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("transactions.savings")}</p>
                    <p className={`text-xl font-bold ${summary.netAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(summary.netAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expenses by category chart (horizontal bars) */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transactions.expensesByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.byCategory
                  .filter(c => c.amount < 0 && c.type !== "non_computable")
                  .sort((a, b) => a.amount - b.amount)
                  .map(cat => {
                    const pct = totalExpenses > 0 ? (Math.abs(cat.amount) / totalExpenses) * 100 : 0
                    return (
                      <div key={cat.categoryId} className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.categoryColor || "#9CA3AF" }}
                            />
                            <span className="text-sm font-medium">{cat.categoryName}</span>
                            <span className="text-xs text-gray-500">({cat.count})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-red-600">{formatCurrency(Math.abs(cat.amount))}</span>
                            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: cat.categoryColor || "#9CA3AF",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}

                {summary.transfersCount > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      {t("transactions.transfersExcluded")}: {summary.transfersCount} ({formatCurrency(Math.abs(summary.transfersTotal))})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Income by category */}
          {summary && summary.byCategory.filter(c => c.amount > 0 && c.type !== "non_computable").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transactions.incomeByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.byCategory
                    .filter(c => c.amount > 0 && c.type !== "non_computable")
                    .sort((a, b) => b.amount - a.amount)
                    .map(cat => (
                      <div key={cat.categoryId} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.categoryColor || "#9CA3AF" }}
                          />
                          <span className="text-sm font-medium">{cat.categoryName}</span>
                          <span className="text-xs text-gray-500">({cat.count})</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  )
}
