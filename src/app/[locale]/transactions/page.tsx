"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload, Edit, Trash2, ArrowLeftRight, Sparkles,
  ChevronLeft, ChevronRight, X, CheckSquare,
  Square, Search
} from "lucide-react"
import { TransactionImportDialog } from "@/components/transactions/transaction-import-dialog"
import { TransactionEditDialog } from "@/components/transactions/transaction-edit-dialog"
import { useTranslations } from "next-intl"
import type { Account, Transaction, TransactionCategory } from "@/types"

export default function TransactionsPage() {
  const t = useTranslations()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterAccountId, setFilterAccountId] = useState<number | "">("")
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [filterCategoryId, setFilterCategoryId] = useState<number | "">("")
  const [filterTransfer, setFilterTransfer] = useState<"all" | "only" | "exclude">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  // Dialogs
  const [importOpen, setImportOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<string>("")

  const limit = 50

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
      const [txRes, accRes, catRes] = await Promise.all([
        fetch(`/api/transactions?accountId=${filterAccountId || ""}&month=${filterMonth || ""}&categoryId=${filterCategoryId || ""}&isTransfer=${filterTransfer === "all" ? "" : filterTransfer === "only"}&page=${page}&limit=${limit}${searchParam}`),
        fetch("/api/accounts"),
        fetch("/api/transactions/categories"),
      ])

      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData.transactions)
        setTotal(txData.total)
      }
      if (accRes.ok) setAccounts(await accRes.json())
      if (catRes.ok) setCategories(await catRes.json())
    } catch (err) {
      console.error("Failed to fetch transactions:", err)
    } finally {
      setLoading(false)
    }
  }, [filterAccountId, filterMonth, filterCategoryId, filterTransfer, searchQuery, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const bankingAccounts = accounts.filter(a => a.category === "Banking")

  // Selection helpers
  const allCurrentPageSelected = useMemo(() => {
    return transactions.length > 0 && transactions.every(tx => selectedIds.has(tx.id))
  }, [transactions, selectedIds])

  const selectedCount = selectedIds.size

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedIds(prev => {
        const next = new Set(prev)
        transactions.forEach(tx => next.delete(tx.id))
        return next
      })
    } else {
      // Select all on current page
      setSelectedIds(prev => {
        const next = new Set(prev)
        transactions.forEach(tx => next.add(tx.id))
        return next
      })
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
    setBulkCategory("")
  }

  const enterSelectionMode = (firstId?: number) => {
    setSelectionMode(true)
    if (firstId !== undefined) {
      setSelectedIds(new Set([firstId]))
    }
  }

  // Bulk handlers
  const handleBulkCategoryChange = async () => {
    if (!bulkCategory || selectedCount === 0) return
    try {
      const res = await fetch("/api/transactions/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { category_id: Number(bulkCategory) }
        }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        setBulkCategory("")
        setSelectionMode(false)
        fetchData()
      }
    } catch (err) {
      console.error("Failed to bulk update category:", err)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return
    const msg = t("transactions.bulkDeleteConfirm", { count: selectedCount })
    if (!confirm(msg)) return

    try {
      await fetch("/api/transactions/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      setSelectedIds(new Set())
      setSelectionMode(false)
      fetchData()
    } catch (err) {
      console.error("Failed to bulk delete:", err)
    }
  }

  const handleBulkToggleTransfer = async (markAsTransfer: boolean) => {
    if (selectedCount === 0) return
    try {
      await fetch("/api/transactions/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { is_transfer: markAsTransfer }
        }),
      })
      setSelectedIds(new Set())
      setSelectionMode(false)
      fetchData()
    } catch (err) {
      console.error("Failed to bulk toggle transfer:", err)
    }
  }

  const handleCategorizeAll = async () => {
    const uncategorizedIds = transactions
      .filter(tx => !tx.category_id)
      .map(tx => tx.id)

    if (uncategorizedIds.length === 0) return

    try {
      const res = await fetch("/api/transactions/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: uncategorizedIds }),
      })

      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error("Failed to categorize:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("transactions.deleteConfirm"))) return
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      fetchData()
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  const handleCategoryChange = async (txId: number, categoryId: number | null) => {
    try {
      await fetch(`/api/transactions/${txId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      })
      fetchData()
    } catch (err) {
      console.error("Failed to update category:", err)
    }
  }

  const handleToggleTransfer = async (txId: number, currentValue: boolean) => {
    try {
      await fetch(`/api/transactions/${txId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_transfer: !currentValue }),
      })
      fetchData()
    } catch (err) {
      console.error("Failed to toggle transfer:", err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  const totalPages = Math.ceil(total / limit)

  // Summary calculations
  const totalIncome = transactions.filter(tx => tx.amount > 0 && !tx.is_transfer).reduce((sum, tx) => {
    const cat = categories.find(c => c.id === tx.category_id)
    if (cat?.type === "non_computable") return sum
    return sum + tx.amount
  }, 0)
  const totalExpenses = transactions.filter(tx => tx.amount < 0 && !tx.is_transfer).reduce((sum, tx) => {
    const cat = categories.find(c => c.id === tx.category_id)
    if (cat?.type === "non_computable") return sum
    return sum + Math.abs(tx.amount)
  }, 0)

  if (loading && transactions.length === 0) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t("transactions.loading")}</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("transactions.title")}</h1>
              <p className="text-gray-600">{t("transactions.subtitle")}</p>
            </div>
            <div className="flex space-x-2">
              {!selectionMode && (
                <>
                  <Button variant="outline" size="sm" onClick={() => enterSelectionMode()} title={t("transactions.selectionMode")}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {t("transactions.selectionMode")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCategorizeAll} title={t("transactions.categorizeAll")}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {t("transactions.aiCategorize")}
                  </Button>
                  <Button size="sm" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-1" />
                    {t("transactions.importCsv")}
                  </Button>
                </>
              )}
              {selectionMode && (
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  {t("transactions.exitSelection")}
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectionMode && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-3">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-sm"
                    >
                      {allCurrentPageSelected ? (
                        <Square className="h-4 w-4 mr-1" />
                      ) : (
                        <CheckSquare className="h-4 w-4 mr-1" />
                      )}
                      {allCurrentPageSelected ? t("transactions.deselectAll") : t("transactions.selectAll")}
                    </Button>
                    <span className="text-sm font-medium text-blue-700">
                      {selectedCount} {t("transactions.selected")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bulk category dropdown */}
                    <div className="flex items-center gap-1">
                      <select
                        className="text-xs rounded-md border border-blue-200 bg-white px-2 py-1.5 max-w-[160px]"
                        value={bulkCategory}
                        onChange={(e) => setBulkCategory(e.target.value)}
                      >
                        <option value="">{t("transactions.bulkCategoryPlaceholder")}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!bulkCategory || selectedCount === 0}
                        onClick={handleBulkCategoryChange}
                      >
                        {t("transactions.bulkSetCategory")}
                      </Button>
                    </div>
                    {/* Bulk transfer toggle */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={selectedCount === 0}
                      onClick={() => handleBulkToggleTransfer(true)}
                    >
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                      {t("transactions.bulkMarkAsTransfer")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={selectedCount === 0}
                      onClick={() => handleBulkToggleTransfer(false)}
                    >
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                      {t("transactions.bulkUnmarkTransfer")}
                    </Button>
                    {/* Bulk delete */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={selectedCount === 0}
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t("transactions.bulkDelete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">{t("transactions.income")}</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">{t("transactions.expenses")}</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">{t("transactions.net")}</p>
                <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t("transactions.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => { setSearchQuery(""); setPage(1) }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <span className="text-sm text-gray-500 whitespace-nowrap">{total} {t("transactions.transactions")}</span>
              </div>

              {/* Filter row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("transactions.month")}</label>
                  <input
                    type="month"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    value={filterMonth}
                    onChange={(e) => { setFilterMonth(e.target.value); setPage(1) }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("transactions.account")}</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    value={filterAccountId}
                    onChange={(e) => { setFilterAccountId(e.target.value ? Number(e.target.value) : ""); setPage(1) }}
                  >
                    <option value="">{t("transactions.allAccounts")}</option>
                    {bankingAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("transactions.category")}</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    value={filterCategoryId}
                    onChange={(e) => { setFilterCategoryId(e.target.value ? Number(e.target.value) : ""); setPage(1) }}
                  >
                    <option value="">{t("transactions.allCategories")}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("transactions.transfers")}</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    value={filterTransfer}
                    onChange={(e) => { setFilterTransfer(e.target.value as "all" | "only" | "exclude"); setPage(1) }}
                  >
                    <option value="all">{t("transactions.showAll")}</option>
                    <option value="exclude">{t("transactions.excludeTransfers")}</option>
                    <option value="only">{t("transactions.onlyTransfers")}</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions list */}
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 text-gray-400 mb-4">
                  <ArrowLeftRight className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("transactions.noTransactions")}</h3>
                <p className="text-gray-600 text-center mb-4">{t("transactions.importFirst")}</p>
                <Button onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("transactions.importCsv")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            {selectionMode && (
                              <th className="py-3 px-2 w-10">
                                <Checkbox
                                  checked={allCurrentPageSelected}
                                  onCheckedChange={toggleSelectAll}
                                />
                              </th>
                            )}
                            <th className="text-left py-3 px-4">{t("transactions.date")}</th>
                            <th className="text-left py-3 px-4">{t("transactions.account")}</th>
                            <th className="text-left py-3 px-4">{t("transactions.description")}</th>
                            <th className="text-left py-3 px-4">{t("transactions.detail")}</th>
                            <th className="text-left py-3 px-4">{t("transactions.category")}</th>
                            <th className="text-right py-3 px-4">{t("transactions.amount")}</th>
                            <th className="text-center py-3 px-4">{t("transactions.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr
                              key={tx.id}
                              className={`border-b hover:bg-gray-50 ${
                                tx.is_transfer ? "bg-blue-50/50" : ""
                              } ${
                                selectionMode && selectedIds.has(tx.id) ? "bg-blue-100/50" : ""
                              }`}
                            >
                              {selectionMode && (
                                <td className="py-3 px-2 text-center">
                                  <Checkbox
                                    checked={selectedIds.has(tx.id)}
                                    onCheckedChange={() => toggleSelect(tx.id)}
                                  />
                                </td>
                              )}
                              <td className="py-3 px-4 whitespace-nowrap">{tx.date}</td>
                              <td className="py-3 px-4 whitespace-nowrap text-gray-500">{tx.account_name}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  {tx.is_transfer ? (
                                    <ArrowLeftRight className="h-3 w-3 text-blue-500 mr-1 flex-shrink-0" />
                                  ) : null}
                                  <span className="truncate max-w-[200px]">{tx.description}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-[200px] truncate text-gray-500">{tx.detail}</td>
                              <td className="py-3 px-4">
                                <select
                                  className="text-xs rounded border border-gray-200 px-1 py-0.5 max-w-[140px]"
                                  value={tx.category_id || ""}
                                  onChange={(e) => handleCategoryChange(tx.id, e.target.value ? Number(e.target.value) : null)}
                                >
                                  <option value="">—</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className={`py-3 px-4 text-right font-medium ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                                {formatCurrency(tx.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center space-x-1">
                                  {!selectionMode && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleToggleTransfer(tx.id, tx.is_transfer)}
                                        title={t("transactions.toggleTransfer")}
                                      >
                                        <ArrowLeftRight className={`h-3.5 w-3.5 ${tx.is_transfer ? "text-blue-500" : "text-gray-400"}`} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setEditingTransaction(tx)}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleDelete(tx.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                  {selectionMode && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => enterSelectionMode(tx.id)}
                                      title={t("transactions.toggleTransfer")}
                                    >
                                      <ArrowLeftRight className={`h-3.5 w-3.5 ${tx.is_transfer ? "text-blue-500" : "text-gray-400"}`} />
                                    </Button>
                                  )}
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

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {transactions.map((tx) => (
                  <Card
                    key={tx.id}
                    className={`hover:shadow-md ${
                      tx.is_transfer ? "border-blue-200" : ""
                    } ${
                      selectionMode && selectedIds.has(tx.id) ? "border-blue-400 bg-blue-50/50" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          {selectionMode && (
                            <Checkbox
                              checked={selectedIds.has(tx.id)}
                              onCheckedChange={() => toggleSelect(tx.id)}
                              className="mt-1"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {tx.is_transfer ? (
                                <ArrowLeftRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              ) : null}
                              <span className="text-xs text-gray-500">{tx.date}</span>
                              {tx.account_name && <span className="text-xs text-blue-600">· {tx.account_name}</span>}
                            </div>
                            <p className="font-medium text-gray-900 truncate">{tx.description}</p>
                            {tx.detail && <p className="text-xs text-gray-500 truncate">{tx.detail}</p>}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className={`font-bold ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <select
                          className="text-xs rounded border border-gray-200 px-1 py-0.5"
                          value={tx.category_id || ""}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">— {t("transactions.noCategory")} —</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        {!selectionMode && (
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => handleToggleTransfer(tx.id, tx.is_transfer)}>
                              <ArrowLeftRight className={`h-3.5 w-3.5 ${tx.is_transfer ? "text-blue-500" : "text-gray-400"}`} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => setEditingTransaction(tx)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {t("transactions.page")} {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Import dialog */}
          <TransactionImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            accounts={accounts}
            onSuccess={fetchData}
          />

          {/* Edit dialog */}
          <TransactionEditDialog
            transaction={editingTransaction}
            categories={categories}
            open={!!editingTransaction}
            onOpenChange={(open) => { if (!open) setEditingTransaction(null) }}
            onSuccess={fetchData}
          />
        </div>
      </MainLayout>
    </AuthGuard>
  )
}