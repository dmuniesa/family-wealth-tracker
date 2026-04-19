"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useTranslations, useLocale } from "next-intl"
import { CategoryDrilldown } from "@/components/analytics/category-drilldown"
import { TransactionList } from "@/components/analytics/transaction-list"
import type { MonthlySummary, Transaction, TransactionCategory } from "@/types"

interface ExpensesTabProps {
  summary: MonthlySummary | null
  categories: TransactionCategory[]
  month: string
}

interface PieDataItem {
  name: string
  value: number
  color: string
  categoryId: number
}

export function ExpensesTab({ summary, categories, month }: ExpensesTabProps) {
  const t = useTranslations("analytics")
  const locale = useLocale()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const fetchCategoryTransactions = useCallback(async (categoryId: number) => {
    try {
      const res = await fetch(
        `/api/transactions?categoryId=${categoryId}&month=${month}&limit=100`
      )
      if (res.ok) {
        const data = await res.json()
        setCategoryTransactions(data.transactions || [])
      }
    } catch (err) {
      console.error("Failed to fetch category transactions:", err)
    }
  }, [month])

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryTransactions(selectedCategoryId)
    } else {
      setCategoryTransactions([])
    }
  }, [selectedCategoryId, fetchCategoryTransactions])

  if (!summary) return null

  const expenseCategories = summary.byCategory
    .filter(c => c.amount < 0 && c.type !== "non_computable")
    .sort((a, b) => a.amount - b.amount)

  const totalExpenses = expenseCategories.reduce((sum, c) => sum + Math.abs(c.amount), 0)

  // Group small categories (< 3%) into "Other"
  const threshold = totalExpenses * 0.03
  const pieData: PieDataItem[] = []
  let otherTotal = 0

  for (const cat of expenseCategories) {
    const absAmount = Math.abs(cat.amount)
    if (absAmount < threshold) {
      otherTotal += absAmount
    } else {
      pieData.push({
        name: cat.categoryName,
        value: absAmount,
        color: cat.categoryColor || "#9CA3AF",
        categoryId: cat.categoryId,
      })
    }
  }

  if (otherTotal > 0) {
    pieData.push({
      name: t("otherCategories"),
      value: otherTotal,
      color: "#D1D5DB",
      categoryId: -1,
    })
  }

  const selectedCategory = selectedCategoryId
    ? expenseCategories.find(c => c.categoryId === selectedCategoryId) || null
    : null

  if (expenseCategories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          {t("noTransactions")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Donut chart + category list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("expensesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => {
                      if (data.categoryId !== -1) {
                        setSelectedCategoryId(
                          selectedCategoryId === data.categoryId ? null : data.categoryId
                        )
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke={selectedCategoryId === entry.categoryId ? "#1F2937" : "none"}
                        strokeWidth={selectedCategoryId === entry.categoryId ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-sm text-gray-500">{t("totalExpenses")}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category list with bars */}
        <Card>
          <CardHeader>
            <CardTitle>{t("topCategories")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseCategories.map(cat => {
              const pct = totalExpenses > 0 ? (Math.abs(cat.amount) / totalExpenses) * 100 : 0
              const isSelected = selectedCategoryId === cat.categoryId
              return (
                <button
                  key={cat.categoryId}
                  className={`w-full text-left rounded-lg p-2 transition-colors ${
                    isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                  onClick={() =>
                    setSelectedCategoryId(isSelected ? null : cat.categoryId)
                  }
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.categoryColor || "#9CA3AF" }}
                      />
                      <span className="text-sm font-medium">{cat.categoryName}</span>
                      <span className="text-xs text-gray-500">({cat.count})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(Math.abs(cat.amount))}
                      </span>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.categoryColor || "#9CA3AF",
                      }}
                    />
                  </div>
                </button>
              )
            })}

            {summary.transfersCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  {t("transfersExcluded")}: {summary.transfersCount} ({formatCurrency(Math.abs(summary.transfersTotal))})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drilldown + transaction list */}
      {selectedCategory && (
        <>
          <CategoryDrilldown category={selectedCategory} totalExpenses={totalExpenses} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {selectedCategory.categoryName}
            </h3>
            <TransactionList
              transactions={categoryTransactions}
              categories={categories}
              onRefresh={() => fetchCategoryTransactions(selectedCategoryId!)}
            />
          </div>
        </>
      )}
    </div>
  )
}
