"use client"

import { useState, useEffect, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DollarSign, TrendingUp, TrendingDown, Plus, CreditCard, Wallet, RefreshCw } from "lucide-react"
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AccountForm } from "@/components/accounts/account-form"
import { BalanceForm } from "@/components/accounts/balance-form"
import { useTranslations } from 'next-intl'
import type { DashboardData, AccountWithBalance } from "@/types"

export default function DashboardPage() {
  const t = useTranslations()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [historicalData, setHistoricalData] = useState<Array<{
    date: string
    total_active: number
    net_worth: number
    total_banking: number
    total_investment: number
    total_debt: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showBalanceForm, setShowBalanceForm] = useState(false)
  const [range, setRange] = useState<'1m' | '6m' | '1y' | 'all'>('1y')
  const [recordBalanceAccount, setRecordBalanceAccount] = useState<AccountWithBalance | null>(null)
  // Which evolution-chart series are visible. Default: only Total Active.
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({ totalActive: true })

  const pieData = accounts
    .filter(account => account.current_balance && account.current_balance > 0)
    .map(account => ({
      name: account.name,
      value: account.current_balance,
      color: account.category === 'Banking' ? '#3B82F6' : account.category === 'Investment' ? '#10B981' : '#EF4444'
    }))

  // Evolvable-chart series. Banking/Investment/Debt reuse the colors used elsewhere on
  // the dashboard; the two derived totals (Active, Net Worth) get their own hues.
  // Palette CVD-validated: worst adjacent pair ΔE 8.1 (clear of the ≥8 target).
  const seriesConfig = [
    { key: 'totalActive', dataKey: 'total_active', color: '#8B5CF6', label: t('dashboard.totalActive') },
    { key: 'netWorth', dataKey: 'net_worth', color: '#F59E0B', label: t('dashboard.netWorth') },
    { key: 'banking', dataKey: 'total_banking', color: '#3B82F6', label: t('dashboard.totalBanking') },
    { key: 'investment', dataKey: 'total_investment', color: '#10B981', label: t('dashboard.totalInvestment') },
    { key: 'debt', dataKey: 'total_debt', color: '#EF4444', label: t('dashboard.totalDebt') },
  ]
  const toggleSeries = (key: string) => {
    setVisibleSeries(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Never let all series be hidden (empty chart).
      if (!seriesConfig.some(s => next[s.key])) return prev
      return next
    })
  }

  // Net worth change vs ~30 days ago, computed client-side from the history series.
  // Falls back to the first entry when there is less than 30 days of history.
  const monthlyDelta = useMemo(() => {
    if (historicalData.length === 0) return null
    const latest = historicalData[historicalData.length - 1]
    const cutoff = new Date(latest.date)
    cutoff.setDate(cutoff.getDate() - 30)
    const onOrBefore = historicalData.filter(item => new Date(item.date) <= cutoff)
    const monthAgo = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : historicalData[0]
    const euro = latest.net_worth - monthAgo.net_worth
    const pct = monthAgo.net_worth !== 0 ? (euro / Math.abs(monthAgo.net_worth)) * 100 : 0
    return { euro, pct }
  }, [historicalData])

  // History sliced by the selected range (1m / 6m / 1y / all)
  const timeSeriesData = useMemo(() => {
    const toPoint = (item: { date: string; total_active: number; net_worth: number; total_banking: number; total_investment: number; total_debt: number }) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total_active: item.total_active,
      net_worth: item.net_worth,
      total_banking: item.total_banking,
      total_investment: item.total_investment,
      total_debt: item.total_debt,
    })
    if (historicalData.length === 0) return []
    const days = range === '1m' ? 30 : range === '6m' ? 180 : range === '1y' ? 365 : 0
    if (range === 'all' || days === 0) return historicalData.map(toPoint)
    const cutoff = new Date(historicalData[historicalData.length - 1].date)
    cutoff.setDate(cutoff.getDate() - days)
    return historicalData.filter(item => new Date(item.date) >= cutoff).map(toPoint)
  }, [historicalData, range])

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

  // Compact currency for axis ticks: €12k / €1.2M — keeps the Y-axis narrow on mobile
  const formatAxisCurrency = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `€${(value / 1_000).toFixed(0)}k`
    return `€${value.toFixed(0)}`
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

        {/* Hero: Net Worth with monthly change */}
        <Card className="bg-muted/30">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.netWorth')}</p>
                <div className="text-3xl sm:text-4xl font-bold mt-1 break-words">
                  {dashboardData ? formatCurrency(dashboardData.net_worth) : '€0.00'}
                </div>
                {monthlyDelta && (
                  <div className={cn(
                    "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-2 text-sm font-medium",
                    monthlyDelta.euro >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {monthlyDelta.euro >= 0 ? (
                      <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>{monthlyDelta.euro >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyDelta.euro))}</span>
                    <span className="text-muted-foreground font-normal">
                      ({monthlyDelta.pct >= 0 ? '+' : ''}{monthlyDelta.pct.toFixed(1)}%) {t('dashboard.vsLastMonth')}
                    </span>
                  </div>
                )}
              </div>
              <DollarSign className="hidden sm:block h-10 w-10 text-muted-foreground/40 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* Supporting tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalBanking')}</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
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
              <TrendingUp className="h-4 w-4 text-green-600" />
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
              <CreditCard className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData ? formatCurrency(-dashboardData.total_debt) : '€0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">{t('dashboard.netWorthEvolution')}</CardTitle>
                  <CardDescription>{t('dashboard.trackWealth')}</CardDescription>
                </div>
                <div className="flex gap-1 self-start sm:self-auto">
                  {(['1m', '6m', '1y', 'all'] as const).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={range === key ? 'default' : 'outline'}
                      onClick={() => setRange(key)}
                      className="h-7 px-2.5 text-xs"
                    >
                      {key === 'all' ? t('dashboard.rangeAll') : key.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickMargin={8}
                    minTickGap={32}
                    interval="preserveStartEnd"
                    stroke="#9CA3AF"
                    tickLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickMargin={4}
                    width={48}
                    stroke="#9CA3AF"
                    tickLine={false}
                    tickFormatter={formatAxisCurrency}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const found = seriesConfig.find(s => s.dataKey === name)
                      return [formatCurrency(value), found?.label ?? name]
                    }}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8 }}
                  />
                  {seriesConfig.filter(s => visibleSeries[s.key]).map(s => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.dataKey}
                      stroke={s.color}
                      strokeWidth={2}
                      name={s.dataKey}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {/* Clickable legend — toggle each series on/off */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {seriesConfig.map(s => {
                  const visible = !!visibleSeries[s.key]
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeries(s.key)}
                      aria-pressed={visible}
                      className="flex items-center space-x-2 cursor-pointer rounded-md hover:bg-muted/50 px-1.5 py-0.5 transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                        style={{ backgroundColor: s.color, opacity: visible ? 1 : 0.25 }}
                      />
                      <span className={cn(
                        'text-sm transition-colors',
                        visible ? 'text-gray-700' : 'text-gray-400 line-through'
                      )}>
                        {s.label}
                      </span>
                    </button>
                  )
                })}
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
                      <span className="text-xs sm:text-sm font-medium">{formatCurrency(entry.value ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Accounts by type, with a per-account update button */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(['Banking', 'Investment', 'Debt'] as const).map((cat) => {
              const group = accounts.filter((a) => a.category === cat)
              if (group.length === 0) return null
              const total = group.reduce((sum, a) => sum + (a.current_balance || 0), 0)
              const cfg = cat === 'Banking'
                ? { icon: Wallet, color: 'text-blue-600' }
                : cat === 'Investment'
                ? { icon: TrendingUp, color: 'text-green-600' }
                : { icon: CreditCard, color: 'text-red-600' }
              const Icon = cfg.icon
              return (
                <Card key={cat}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                        <CardTitle className="text-base truncate">
                          {t(`categories.${cat.toLowerCase()}`)}
                        </CardTitle>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {group.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between gap-2 py-2.5 border-b last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.current_balance != null
                              ? formatCurrency(account.current_balance)
                              : t('accounts.noBalanceRecorded')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 flex-shrink-0"
                          onClick={() => setRecordBalanceAccount(account)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">{t('dashboard.recordBalance')}</span>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Record balance for a specific account */}
        <Dialog
          open={!!recordBalanceAccount}
          onOpenChange={(open) => { if (!open) setRecordBalanceAccount(null) }}
        >
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>
                {recordBalanceAccount
                  ? `${t('dashboard.recordBalance')} - ${recordBalanceAccount.name}`
                  : t('dashboard.recordBalance')}
              </DialogTitle>
            </DialogHeader>
            {recordBalanceAccount && (
              <BalanceForm
                accounts={[recordBalanceAccount]}
                hideAccountSelection={true}
                defaultAmount={recordBalanceAccount.current_balance || 0}
                onSuccess={() => {
                  setRecordBalanceAccount(null)
                  refreshData()
                }}
                onCancel={() => setRecordBalanceAccount(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}