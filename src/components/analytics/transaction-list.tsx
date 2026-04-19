"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ArrowLeftRight } from "lucide-react"
import { TransactionEditDialog } from "@/components/transactions/transaction-edit-dialog"
import { useTranslations, useLocale } from "next-intl"
import type { Transaction, TransactionCategory } from "@/types"

interface TransactionListProps {
  transactions: Transaction[]
  categories: TransactionCategory[]
  onRefresh: () => void
}

export function TransactionList({ transactions, categories, onRefresh }: TransactionListProps) {
  const t = useTranslations("transactions")
  const locale = useLocale()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const handleCategoryChange = async (txId: number, categoryId: number | null) => {
    try {
      await fetch(`/api/transactions/${txId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      })
      onRefresh()
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
      onRefresh()
    } catch (err) {
      console.error("Failed to toggle transfer:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      onRefresh()
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  if (transactions.length === 0) return null

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">{t("date")}</th>
                    <th className="text-left py-3 px-4">{t("account")}</th>
                    <th className="text-left py-3 px-4">{t("description")}</th>
                    <th className="text-left py-3 px-4">{t("detail")}</th>
                    <th className="text-left py-3 px-4">{t("category")}</th>
                    <th className="text-right py-3 px-4">{t("amount")}</th>
                    <th className="text-center py-3 px-4">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b hover:bg-gray-50 ${
                        tx.is_transfer ? "bg-blue-50/50" : ""
                      }`}
                    >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleTransfer(tx.id, tx.is_transfer)}
                            title={t("toggleTransfer")}
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
            }`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
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
                  <option value="">— {t("noCategory")} —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => handleToggleTransfer(tx.id, tx.is_transfer)}>
                    <ArrowLeftRight className={`h-3.5 w-3.5 ${tx.is_transfer ? "text-blue-500" : "text-gray-400"}`} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => setEditingTransaction(tx)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => handleDelete(tx.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <TransactionEditDialog
        transaction={editingTransaction}
        categories={categories}
        open={!!editingTransaction}
        onOpenChange={(open) => { if (!open) setEditingTransaction(null) }}
        onSuccess={() => { setEditingTransaction(null); onRefresh() }}
      />
    </>
  )
}
