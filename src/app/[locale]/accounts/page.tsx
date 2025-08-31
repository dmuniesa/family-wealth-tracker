"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash, Wallet, TrendingUp } from "lucide-react"
import { AccountForm } from "@/components/accounts/account-form"
import { useTranslations } from 'next-intl'
import type { AccountWithBalance } from "@/types"

export default function AccountsPage() {
  const t = useTranslations()
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const handleDeleteAccount = async (accountId: number) => {
    if (confirm(t('accounts.deleteConfirm'))) {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setAccounts(accounts.filter(account => account.id !== accountId))
        }
      } catch (error) {
        console.error('Failed to delete account:', error)
      }
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('accounts.loading')}</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('accounts.title')}</h1>
            <p className="text-gray-600">{t('accounts.subtitle')}</p>
          </div>
          <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('accounts.addAccount')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>{t('accounts.addAccount')}</DialogTitle>
              </DialogHeader>
              <AccountForm
                onSuccess={() => {
                  setShowAccountForm(false)
                  fetchAccounts()
                }}
                onCancel={() => setShowAccountForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('accounts.noAccountsYet')}</h3>
              <p className="text-gray-600 text-center mb-4">
                {t('accounts.getStarted')}
              </p>
              <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('accounts.addFirstAccount')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('accounts.addFirstAccount')}</DialogTitle>
                  </DialogHeader>
                  <AccountForm
                    onSuccess={() => {
                      setShowAccountForm(false)
                      fetchAccounts()
                    }}
                    onCancel={() => setShowAccountForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {account.category === 'Banking' ? (
                        <Wallet className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        account.category === 'Banking' 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {t(`categories.${account.category.toLowerCase()}`)}
                      </span>
                    </div>
                    <div className="flex space-x-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingAccount(account)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base sm:text-lg truncate">{account.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">IBAN</p>
                    <p className="font-mono text-xs sm:text-sm bg-gray-50 px-2 py-1 rounded break-all">
                      {account.iban_encrypted}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('accounts.currentBalance')}</p>
                    <p className="text-lg font-semibold">
                      {account.current_balance ? formatCurrency(account.current_balance) : t('accounts.noBalanceRecorded')}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">{t('accounts.currency')}</p>
                      <p className="text-sm">{account.currency}</p>
                    </div>
                    {account.last_balance_date && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{t('accounts.lastUpdated')}</p>
                        <p className="text-xs sm:text-sm">{new Date(account.last_balance_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {account.notes && (
                    <div>
                      <p className="text-sm text-gray-600">{t('accounts.notes')}</p>
                      <p className="text-sm break-words">{account.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Account Modal */}
        <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('accounts.editAccount')}</DialogTitle>
            </DialogHeader>
            {editingAccount && (
              <AccountForm
                isEdit={true}
                initialData={{
                  id: editingAccount.id,
                  name: editingAccount.name,
                  category: editingAccount.category,
                  currency: editingAccount.currency,
                  iban: editingAccount.iban_encrypted,
                  notes: editingAccount.notes || "",
                }}
                onSuccess={() => {
                  setEditingAccount(null)
                  fetchAccounts()
                }}
                onCancel={() => setEditingAccount(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}