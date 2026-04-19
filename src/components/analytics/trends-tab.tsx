"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import type { MonthlySummary } from "@/types"

interface TrendsTabProps {
  trends: MonthlySummary[]
}

export function TrendsTab({ trends }: TrendsTabProps) {
  const t = useTranslations("analytics")
  const locale = useLocale()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatMonth = (month: string) => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
      month: "short",
    })
  }

  const chartData = trends.map(s => ({
    month: formatMonth(s.month),
    income: s.totalIncome,
    expenses: s.totalExpenses,
    savings: s.netAmount,
  }))

  // Month-over-month comparison (last 2 months)
  const lastTwo = trends.slice(-2)
  const incomeChange = lastTwo.length === 2
    ? lastTwo[1].totalIncome - lastTwo[0].totalIncome
    : 0
  const expenseChange = lastTwo.length === 2
    ? lastTwo[1].totalExpenses - lastTwo[0].totalExpenses
    : 0
  const incomeChangePct = lastTwo.length === 2 && lastTwo[0].totalIncome > 0
    ? (incomeChange / lastTwo[0].totalIncome) * 100
    : 0
  const expenseChangePct = lastTwo.length === 2 && lastTwo[0].totalExpenses > 0
    ? (expenseChange / lastTwo[0].totalExpenses) * 100
    : 0

  if (trends.length === 0) {
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
      {/* Income vs Expenses bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("incomeVsExpenses")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
                    style: "currency",
                    currency: "EUR",
                  }).format(value),
                  name === "income" ? t("income") : t("expenses"),
                ]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }}
              />
              <Legend
                formatter={(value) => (value === "income" ? t("income") : t("expenses"))}
              />
              <Bar
                dataKey="income"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                name="income"
              />
              <Bar
                dataKey="expenses"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                name="expenses"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month-over-month comparison */}
      {lastTwo.length === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("monthComparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Income change */}
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  incomeChange >= 0 ? "bg-green-100" : "bg-red-100"
                }`}>
                  {incomeChange >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("incomeChange")}</p>
                  <p className={`text-lg font-bold ${
                    incomeChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {incomeChange >= 0 ? "+" : ""}{formatCurrency(incomeChange)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {incomeChangePct >= 0 ? "+" : ""}{incomeChangePct.toFixed(1)}% {t("fromPreviousMonth")}
                  </p>
                </div>
              </div>

              {/* Expense change */}
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  expenseChange <= 0 ? "bg-green-100" : "bg-red-100"
                }`}>
                  {expenseChange <= 0 ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("expenseChange")}</p>
                  <p className={`text-lg font-bold ${
                    expenseChange <= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {expenseChange >= 0 ? "+" : ""}{formatCurrency(expenseChange)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {expenseChangePct >= 0 ? "+" : ""}{expenseChangePct.toFixed(1)}% {t("fromPreviousMonth")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
