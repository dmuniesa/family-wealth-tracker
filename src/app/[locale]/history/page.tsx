"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Trash, Plus } from "lucide-react"
import { BalanceForm } from "@/components/accounts/balance-form"
import { useTranslations } from 'next-intl'
import type { Balance, Account } from "@/types"

interface BalanceWithAccount extends Balance {
  account: Account
}

export default function HistoryPage() {
  const t = useTranslations()
  const [balances, setBalances] = useState<BalanceWithAccount[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalanceForm, setShowBalanceForm] = useState(false)
  const [editingBalance, setEditingBalance] = useState<BalanceWithAccount | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balancesRes, accountsRes] = await Promise.all([
          fetch('/api/balances'),
          fetch('/api/accounts')
        ])

        if (balancesRes.ok && accountsRes.ok) {
          const balancesData = await balancesRes.json()
          const accountsData = await accountsRes.json()
          
          const balancesWithAccounts = balancesData.map((balance: Balance) => ({
            ...balance,
            account: accountsData.find((acc: Account) => acc.id === balance.account_id)
          }))

          setBalances(balancesWithAccounts)
          setAccounts(accountsData)
        }
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const refreshData = async () => {
    try {
      const [balancesRes, accountsRes] = await Promise.all([
        fetch('/api/balances'),
        fetch('/api/accounts')
      ])

      if (balancesRes.ok && accountsRes.ok) {
        const balancesData = await balancesRes.json()
        const accountsData = await accountsRes.json()
        
        const balancesWithAccounts = balancesData.map((balance: Balance) => ({
          ...balance,
          account: accountsData.find((acc: Account) => acc.id === balance.account_id)
        }))

        setBalances(balancesWithAccounts)
        setAccounts(accountsData)
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const handleDeleteBalance = async (balanceId: number) => {
    if (confirm(t('history.deleteConfirm'))) {
      try {
        const response = await fetch(`/api/balances/${balanceId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setBalances(balances.filter(balance => balance.id !== balanceId))
        }
      } catch (error) {
        console.error('Failed to delete balance:', error)
      }
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('history.loading')}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('history.title')}</h1>
            <p className="text-gray-600">{t('history.subtitle')}</p>
          </div>
          <Dialog open={showBalanceForm} onOpenChange={setShowBalanceForm}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('history.recordBalance')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>{t('history.recordBalance')}</DialogTitle>
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

        {balances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 text-gray-400 mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('history.noRecordsYet')}</h3>
              <p className="text-gray-600 text-center mb-4">
                {t('history.startTracking')}
              </p>
              <Dialog open={showBalanceForm} onOpenChange={setShowBalanceForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('history.recordFirstBalance')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('history.recordFirstBalance')}</DialogTitle>
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('history.allRecords')}</h2>
            
            {/* Desktop table view */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4">{t('history.date')}</th>
                          <th className="text-left py-3 px-4">{t('history.account')}</th>
                          <th className="text-left py-3 px-4">{t('history.category')}</th>
                          <th className="text-right py-3 px-4">{t('history.amount')}</th>
                          <th className="text-right py-3 px-4">{t('history.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {balances.map((balance) => (
                          <tr key={balance.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {new Date(balance.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{balance.account?.name}</div>
                                <div className="text-sm text-gray-500 font-mono">
                                  {balance.account?.iban_encrypted}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                balance.account?.category === 'Banking' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {t(`categories.${balance.account?.category?.toLowerCase()}`)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(balance.amount, balance.account?.currency)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingBalance(balance)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteBalance(balance.id)}
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden space-y-3">
              {balances.map((balance) => (
                <Card key={balance.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            balance.account?.category === 'Banking' 
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {t(`categories.${balance.account?.category?.toLowerCase()}`)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(balance.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 truncate">{balance.account?.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {balance.account?.iban_encrypted}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingBalance(balance)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteBalance(balance.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        {formatCurrency(balance.amount, balance.account?.currency)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Edit Balance Modal */}
        <Dialog open={!!editingBalance} onOpenChange={() => setEditingBalance(null)}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>{t('history.editRecord')}</DialogTitle>
            </DialogHeader>
            {editingBalance && (
              <BalanceForm
                accounts={accounts}
                isEdit={true}
                initialData={{
                  id: editingBalance.id,
                  account_id: editingBalance.account_id,
                  amount: editingBalance.amount,
                  date: editingBalance.date,
                }}
                onSuccess={() => {
                  setEditingBalance(null)
                  refreshData()
                }}
                onCancel={() => setEditingBalance(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}