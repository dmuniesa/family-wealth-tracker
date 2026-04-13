"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import type { Transaction, TransactionCategory } from "@/types"

interface TransactionEditDialogProps {
  transaction: Transaction | null
  categories: TransactionCategory[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TransactionEditDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: TransactionEditDialogProps) {
  const t = useTranslations()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [isTransfer, setIsTransfer] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.category_id || null)
      setIsTransfer(transaction.is_transfer)
      setNotes(transaction.notes || "")
    }
  }, [transaction])

  const handleSave = async () => {
    if (!transaction) return
    setLoading(true)

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          is_transfer: isTransfer,
          notes,
        }),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
      }
    } catch (err) {
      console.error("Failed to update transaction:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transactions.editTransaction")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("transactions.date")}:</span>
              <span className="font-medium">{transaction.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("transactions.description")}:</span>
              <span className="font-medium text-right max-w-[200px] truncate">{transaction.description}</span>
            </div>
            {transaction.detail && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t("transactions.detail")}:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{transaction.detail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t("transactions.amount")}:</span>
              <span className={`font-bold ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("transactions.category")}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={categoryId || ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t("transactions.noCategory")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isTransfer"
              checked={isTransfer}
              onChange={(e) => setIsTransfer(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isTransfer" className="text-sm font-medium text-gray-700">
              {t("transactions.markAsTransfer")}
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("transactions.notes")}
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("transactions.notesPlaceholder")}
            />
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("transactions.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? t("transactions.saving") : t("transactions.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
