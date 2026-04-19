"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useTranslations, useLocale } from "next-intl"
import { TransactionList } from "@/components/analytics/transaction-list"
import type { CategoryEvolution, Transaction, TransactionCategory } from "@/types"

interface CategoryEvolutionTabProps {
  data: CategoryEvolution[]
  categories: TransactionCategory[]
  month: string
}

export function CategoryEvolutionTab({ data, categories, month }: CategoryEvolutionTabProps) {
  const t = useTranslations("analytics")
  const locale = useLocale()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [y, m] = monthStr.split("-").map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
      month: "short",
      year: "2-digit",
    })
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

  // Filter to expense categories only (type === 'expense' or 'both')
  const expenseCategories = useMemo(
    () => data.filter(c => c.type === "expense" || c.type === "both"),
    [data]
  )

  // Sort by total amount descending for the dropdown
  const sortedCategories = useMemo(
    () =>
      [...expenseCategories].sort((a, b) => {
        const totalA = a.evolution.reduce((s, e) => s + e.amount, 0)
        const totalB = b.evolution.reduce((s, e) => s + e.amount, 0)
        return totalB - totalA
      }),
    [expenseCategories]
  )

  // Get all unique months across all categories
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>()
    for (const cat of expenseCategories) {
      for (const e of cat.evolution) {
        monthSet.add(e.month)
      }
    }
    return Array.from(monthSet).sort()
  }, [expenseCategories])

  // Build chart data: either single category or top 5
  const chartData = useMemo(() => {
    const categoriesToShow = selectedCategoryId
      ? expenseCategories.filter(c => c.categoryId === selectedCategoryId)
      : sortedCategories.slice(0, 5)

    return allMonths.map(m => {
      const point: Record<string, string | number> = { month: formatMonth(m) }
      for (const cat of categoriesToShow) {
        const entry = cat.evolution.find(e => e.month === m)
        point[cat.categoryName] = entry ? entry.amount : 0
      }
      return point
    })
  }, [selectedCategoryId, expenseCategories, sortedCategories, allMonths])

  const categoriesToShow = selectedCategoryId
    ? expenseCategories.filter(c => c.categoryId === selectedCategoryId)
    : sortedCategories.slice(0, 5)

  if (expenseCategories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          {t("noCategoryData")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {t("selectCategory")}:
            </label>
            <select
              value={selectedCategoryId || "all"}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value === "all" ? null : Number(e.target.value))
              }
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">{t("showAllCategories")}</option>
              {sortedCategories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Line chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategoryId
              ? t("evolutionOf").replace("{category}", categoriesToShow[0]?.categoryName || "")
              : t("categoryEvolution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
              />
              <Legend />
              {categoriesToShow.map(cat => (
                <Line
                  key={cat.categoryId}
                  type="monotone"
                  dataKey={cat.categoryName}
                  stroke={cat.categoryColor || "#9CA3AF"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">
                    {t("selectCategory")}
                  </th>
                  {allMonths.map(m => (
                    <th key={m} className="text-right py-2 px-2 text-gray-500 font-medium">
                      {formatMonth(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoriesToShow.map(cat => (
                  <tr key={cat.categoryId} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.categoryColor || "#9CA3AF" }}
                      />
                      <span className="font-medium">{cat.categoryName}</span>
                    </td>
                    {allMonths.map(m => {
                      const entry = cat.evolution.find(e => e.month === m)
                      return (
                        <td key={m} className="text-right py-2 px-2 text-gray-700">
                          {entry ? formatCurrency(entry.amount) : "-"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction list for selected category */}
      {selectedCategoryId && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {categoriesToShow[0]?.categoryName}
          </h3>
          <TransactionList
            transactions={categoryTransactions}
            categories={categories}
            onRefresh={() => fetchCategoryTransactions(selectedCategoryId)}
          />
        </div>
      )}
    </div>
  )
}
