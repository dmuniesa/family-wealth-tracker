"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useTranslations } from "next-intl"
import { MonthNavigator } from "@/components/analytics/month-navigator"
import { OverviewTab } from "@/components/analytics/overview-tab"
import { ExpensesTab } from "@/components/analytics/expenses-tab"
import { TrendsTab } from "@/components/analytics/trends-tab"
import { CategoryEvolutionTab } from "@/components/analytics/category-evolution-tab"
import type { MonthlySummary, CategoryEvolution } from "@/types"

export default function AnalyticsPage() {
  const t = useTranslations("analytics")
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [trends, setTrends] = useState<MonthlySummary[]>([])
  const [categoryEvolution, setCategoryEvolution] = useState<CategoryEvolution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [summaryRes, trendsRes, evolutionRes] = await Promise.all([
          fetch(`/api/transactions/analytics/monthly?month=${month}`),
          fetch(`/api/transactions/analytics/trends?months=12`),
          fetch(`/api/analytics/category-evolution?months=12`),
        ])
        if (summaryRes.ok) setSummary(await summaryRes.json())
        if (trendsRes.ok) setTrends(await trendsRes.json())
        if (evolutionRes.ok) setCategoryEvolution(await evolutionRes.json())
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [month])

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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("title")}</h1>
              <p className="text-gray-600">{t("subtitle")}</p>
            </div>
          </div>

          {/* Month navigator */}
          <MonthNavigator month={month} onChange={setMonth} />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="overview" className="flex-1 sm:flex-none">{t("tabOverview")}</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1 sm:flex-none">{t("tabExpenses")}</TabsTrigger>
              <TabsTrigger value="trends" className="flex-1 sm:flex-none">{t("tabTrends")}</TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 sm:flex-none">{t("tabCategories")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab summary={summary} />
            </TabsContent>

            <TabsContent value="expenses">
              <ExpensesTab summary={summary} />
            </TabsContent>

            <TabsContent value="trends">
              <TrendsTab trends={trends} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryEvolutionTab data={categoryEvolution} />
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}
