"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash, Wallet, TrendingUp, RefreshCw, Calculator } from "lucide-react"
import { AccountForm } from "@/components/accounts/account-form"
import { useTranslations } from 'next-intl'
import type { AccountWithBalance } from "@/types"

export default function AccountsPage() {
  const t = useTranslations()
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null)
  const [viewingAmortization, setViewingAmortization] = useState<AccountWithBalance | null>(null)
  const [amortizationData, setAmortizationData] = useState<any>(null)
  const [loadingAmortization, setLoadingAmortization] = useState(false)

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

  const handleAutoUpdate = async (accountId: number) => {
    if (confirm('Apply automatic monthly update for this debt account?')) {
      try {
        const response = await fetch(`/api/accounts/${accountId}/auto-update`, {
          method: 'POST'
        })
        
        const data = await response.json()
        
        if (response.ok) {
          alert(`Update applied successfully! New balance: €${data.newBalance.toFixed(2)}, Interest added: €${data.interestAdded.toFixed(2)}`)
          fetchAccounts()
        } else {
          alert(`Error: ${data.error}`)
        }
      } catch (error) {
        console.error('Failed to apply auto update:', error)
        alert('Failed to apply auto update')
      }
    }
  }

  const handleViewAmortization = async (account: AccountWithBalance) => {
    setViewingAmortization(account)
    setLoadingAmortization(true)
    
    try {
      const response = await fetch(`/api/accounts/${account.id}/amortization`)
      const data = await response.json()
      
      if (response.ok) {
        setAmortizationData(data)
      } else {
        alert(`Error loading amortization: ${data.error}`)
        setViewingAmortization(null)
      }
    } catch (error) {
      console.error('Failed to load amortization:', error)
      alert('Failed to load amortization schedule')
      setViewingAmortization(null)
    } finally {
      setLoadingAmortization(false)
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
                      ) : account.category === 'Investment' ? (
                        <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        account.category === 'Banking' 
                          ? 'bg-blue-100 text-blue-700'
                          : account.category === 'Investment'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {t(`categories.${account.category.toLowerCase()}`)}
                      </span>
                    </div>
                    <div className="flex space-x-1 flex-shrink-0">
                      {account.category === 'Debt' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewAmortization(account)}
                          className="h-8 w-8 p-0"
                          title="View amortization schedule"
                        >
                          <Calculator className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {account.category === 'Debt' && (account as any).auto_update_enabled && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleAutoUpdate(account.id)}
                          className="h-8 w-8 p-0"
                          title="Apply monthly update"
                        >
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
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
                  {account.category !== 'Debt' && (
                    <div>
                      <p className="text-sm text-gray-600">IBAN</p>
                      <p className="font-mono text-xs sm:text-sm bg-gray-50 px-2 py-1 rounded break-all">
                        {account.iban_encrypted}
                      </p>
                    </div>
                  )}
                  {account.category === 'Debt' && (
                    <>
                      {(account as any).apr_rate && (
                        <div>
                          <p className="text-sm text-gray-600">APR Rate</p>
                          <p className="text-sm">{((account as any).apr_rate * 100).toFixed(2)}%</p>
                        </div>
                      )}
                      {(account as any).monthly_payment && (
                        <div>
                          <p className="text-sm text-gray-600">Monthly Payment</p>
                          <p className="text-sm font-medium">{formatCurrency((account as any).monthly_payment)}</p>
                        </div>
                      )}
                      {(account as any).loan_term_months && (
                        <div>
                          <p className="text-sm text-gray-600">Loan Term</p>
                          <p className="text-sm">{(account as any).loan_term_months} months</p>
                        </div>
                      )}
                      {(account as any).remaining_months && (
                        <div>
                          <p className="text-sm text-gray-600">Remaining Payments</p>
                          <p className="text-sm font-medium text-orange-600">
                            {(account as any).remaining_months} payments left
                          </p>
                        </div>
                      )}
                      {(account as any).original_balance && (
                        <div>
                          <p className="text-sm text-gray-600">Original Balance</p>
                          <p className="text-sm">{formatCurrency((account as any).original_balance)}</p>
                        </div>
                      )}
                    </>
                  )}
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
                  // Include debt amortization fields
                  apr_rate: (editingAccount as any).apr_rate,
                  monthly_payment: (editingAccount as any).monthly_payment,
                  loan_term_months: (editingAccount as any).loan_term_months,
                  payment_type: (editingAccount as any).payment_type,
                  auto_update_enabled: (editingAccount as any).auto_update_enabled,
                  original_balance: (editingAccount as any).original_balance,
                  loan_start_date: (editingAccount as any).loan_start_date,
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

        {/* Amortization Schedule Modal */}
        <Dialog open={!!viewingAmortization} onOpenChange={() => {
          setViewingAmortization(null)
          setAmortizationData(null)
        }}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Amortization Schedule - {viewingAmortization?.name}
              </DialogTitle>
            </DialogHeader>
            {loadingAmortization ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : amortizationData?.schedule ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p className="font-semibold">{formatCurrency(amortizationData.schedule.currentBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Payment</p>
                    <p className="font-semibold">{formatCurrency(amortizationData.schedule.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining Months</p>
                    <p className="font-semibold">{amortizationData.schedule.remainingMonths}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Interest</p>
                    <p className="font-semibold">{formatCurrency(amortizationData.schedule.totalInterest)}</p>
                  </div>
                </div>

                {/* Payment Schedule Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Total Payment</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amortizationData.schedule.payments.slice(0, 24).map((payment: any, index: number) => (
                        <TableRow key={payment.month}>
                          <TableCell>{payment.month}</TableCell>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>{formatCurrency(payment.interestPayment)}</TableCell>
                          <TableCell>{formatCurrency(payment.principalPayment)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(payment.totalPayment)}</TableCell>
                          <TableCell>{formatCurrency(payment.remainingBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {amortizationData.schedule.payments.length > 24 && (
                    <div className="p-4 text-center text-sm text-gray-500 border-t">
                      Showing first 24 payments of {amortizationData.schedule.payments.length} total
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No amortization data available
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}