"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DollarSign, TrendingUp, TrendingDown, Plus, CreditCard } from "lucide-react"
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AccountForm } from "@/components/accounts/account-form"
import { BalanceForm } from "@/components/accounts/balance-form"
import { useTranslations } from 'next-intl'
import type { DashboardData, AccountWithBalance } from "@/types"

export default function DashboardPage() {
  const t = useTranslations()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; net_worth: number; total_active: number }>>([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showBalanceForm, setShowBalanceForm] = useState(false)

  const pieData = accounts
    .filter(account => account.current_balance && account.current_balance > 0)
    .map(account => ({
      name: account.name,
      value: account.current_balance,
      color: account.category === 'Banking' ? '#3B82F6' : account.category === 'Investment' ? '#10B981' : '#EF4444'
    }))

  const timeSeriesData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    netWorth: item.net_worth,
    totalActive: item.total_active
  }))

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, accountsRes, historyRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/accounts'),
          fetch('/api/dashboard/history')
        ])
        
        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setDashboardData(data)
        }
        
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData)
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setHistoricalData(historyData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const refreshData = async () => {
    try {
      const [dashboardRes, accountsRes, historyRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/accounts'),
        fetch('/api/dashboard/history')
      ])
      
      if (dashboardRes.ok) {
        const data = await dashboardRes.json()
        setDashboardData(data)
      }
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData)
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setHistoricalData(historyData)
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    const formatted = Math.abs(percentage).toFixed(1)
    return `${percentage >= 0 ? '+' : '-'}${formatted}%`
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('dashboard.loading')}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="sm:inline">{t('dashboard.addAccount')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>{t('accounts.addAccount')}</DialogTitle>
                </DialogHeader>
                <AccountForm
                  onSuccess={() => {
                    setShowAccountForm(false)
                    refreshData()
                  }}
                  onCancel={() => setShowAccountForm(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showBalanceForm} onOpenChange={setShowBalanceForm}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="sm:inline">{t('dashboard.recordBalance')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>{t('dashboard.recordBalance')}</DialogTitle>
                </DialogHeader>
                <BalanceForm
                  accounts={accounts}
                  onSuccess={() => {
                    setShowBalanceForm(false)
                    refreshData()
                  }}
                  onCancel={() => setShowBalanceForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalBanking')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData ? formatCurrency(dashboardData.total_banking) : '€0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalInvestment')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData ? formatCurrency(dashboardData.total_investment) : '€0.00'}
              </div>
            </CardContent>
          </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalActive')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData ? formatCurrency((dashboardData.total_banking || 0) + (dashboardData.total_investment || 0)) : '€0.00'}
                </div>
              </CardContent>
            </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalDebt')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData ? formatCurrency(-dashboardData.total_debt) : '€0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.netWorth')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData ? formatCurrency(dashboardData.net_worth) : '€0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.monthlyChange')}</CardTitle>
              {dashboardData && dashboardData.month_over_month_change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                dashboardData && dashboardData.month_over_month_change >= 0 
                  ? "text-green-600" 
                  : "text-red-600"
              )}>
                {dashboardData ? formatPercentage(dashboardData.month_over_month_change) : '0.0%'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('dashboard.netWorthEvolution')}</CardTitle>
              <CardDescription>{t('dashboard.trackWealth')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickMargin={8}
                  />
                  {/* Left Y-axis for Total Active */}
                  <YAxis 
                    yAxisId="left"
                    fontSize={12}
                    tickMargin={8}
                    stroke="#10B981"
                  />
                  {/* Right Y-axis for Net Worth */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    fontSize={12}
                    tickMargin={8}
                    stroke="#3B82F6"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const label = name === 'totalActive' ? t('dashboard.totalActive') : t('dashboard.netWorth');
                      return [formatCurrency(value), label];
                    }}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                  />
                  {/* Total Active line (left axis) */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="totalActive" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="totalActive"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  />
                  {/* Net Worth line (right axis) */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="netWorth" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="netWorth"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{t('dashboard.totalActive')} (Left)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{t('dashboard.netWorth')} (Right)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('dashboard.assetDistribution')}</CardTitle>
              <CardDescription>{t('dashboard.assetsVsDebts')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {pieData.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs sm:text-sm truncate max-w-[120px]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}