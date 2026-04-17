"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, CheckCircle, AlertCircle, ArrowRight, Ban, ArrowLeftRight, Sparkles, Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Account, TransactionCategory } from "@/types"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onSuccess: () => void
}

interface PreviewTransaction {
  date: string
  valueDate?: string
  description: string
  detail?: string
  amount: number
  currency: string
  movementType?: string
  balanceAfter?: number
  observations?: string
  isTransfer: boolean
  categoryId?: number | null
}

export function TransactionImportDialog({ open, onOpenChange, accounts, onSuccess }: ImportDialogProps) {
  const t = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bankingAccounts = accounts.filter(a => a.category === "Banking")

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState("")
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [parseErrors, setParseErrors] = useState<{ row: number; message: string }[]>([])
  const [result, setResult] = useState<{ saved: number; duplicates: number; errors: number } | null>(null)
  const [error, setError] = useState("")
  const [filterText, setFilterText] = useState("")

  useEffect(() => {
    if (open && step === 2 && categories.length === 0) {
      fetch("/api/transactions/categories")
        .then(res => res.ok ? res.json() : [])
        .then(data => setCategories(data))
        .catch(() => {})
    }
  }, [open, step, categories.length])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      setError("")
    }
  }

  const handleParse = async () => {
    if (!csvFile || !selectedAccountId) return
    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("csvFile", csvFile)
      formData.append("accountId", String(selectedAccountId))

      const res = await fetch("/api/transactions/import/parse", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Parse error")
        setLoading(false)
        return
      }

      setDetectedFormat(data.format)
      setPreviewTransactions(data.transactions)
      setDuplicateCount(data.duplicateCount)
      setParseErrors(data.parseErrors || [])
      setStep(2)
    } catch (err) {
      setError("Failed to parse CSV")
    } finally {
      setLoading(false)
    }
  }

  const handleAiCategorize = async () => {
    if (previewTransactions.length === 0) return
    setAiLoading(true)
    setError("")

    try {
      const uncategorized = previewTransactions
        .map((tx, i) => ({ ...tx, index: i }))
        .filter(tx => !tx.categoryId)

      if (uncategorized.length === 0) return

      const res = await fetch("/api/transactions/categorize/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: uncategorized.map(tx => ({
            index: tx.index,
            description: tx.description,
            detail: tx.detail || "",
            amount: tx.amount,
            movementType: tx.movementType || "",
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "AI categorization failed")
        return
      }

      // Apply AI results
      setPreviewTransactions(prev => prev.map((tx, i) => {
        const match = data.categorizations.find((c: { index: number; categoryId: number }) => c.index === i)
        if (match) {
          return { ...tx, categoryId: match.categoryId }
        }
        return tx
      }))
    } catch (err) {
      setError("Failed to categorize with AI")
    } finally {
      setAiLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedAccountId) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/transactions/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          transactions: previewTransactions,
          source: detectedFormat,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import error")
        setLoading(false)
        return
      }

      setResult(data)
      setStep(3)
    } catch (err) {
      setError("Failed to import transactions")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedAccountId(null)
    setCsvFile(null)
    setPreviewTransactions([])
    setDuplicateCount(0)
    setParseErrors([])
    setResult(null)
    setError("")
    onOpenChange(false)
    if (result && result.saved > 0) {
      onSuccess()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
  }

  const toggleTransfer = (index: number) => {
    setPreviewTransactions(prev => prev.map((tx, i) =>
      i === index ? { ...tx, isTransfer: !tx.isTransfer } : tx
    ))
  }

  const updateCategory = (index: number, categoryId: number | null) => {
    setPreviewTransactions(prev => prev.map((tx, i) =>
      i === index ? { ...tx, categoryId } : tx
    ))
  }

  const filteredTransactions = filterText
    ? previewTransactions.filter(tx =>
        tx.description.toLowerCase().includes(filterText.toLowerCase()) ||
        (tx.detail && tx.detail.toLowerCase().includes(filterText.toLowerCase())) ||
        String(tx.amount).includes(filterText)
      )
    : previewTransactions

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("transactions.importTitle")}</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ArrowRight className="h-4 w-4 mx-1 text-gray-400" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select account + upload file */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("transactions.selectAccount")}
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={selectedAccountId || ""}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              >
                <option value="">{t("transactions.selectAccountPlaceholder")}</option>
                {bankingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("transactions.csvFile")}
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {csvFile ? csvFile.name : t("transactions.dropCsv")}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleParse}
              disabled={!selectedAccountId || !csvFile || loading}
            >
              {loading ? t("transactions.parsing") : t("transactions.parseFile")}
            </Button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t("transactions.format")}: <span className="font-medium">{detectedFormat}</span>
              </div>
              <div className="text-sm text-gray-600">
                {t("transactions.new")}: <span className="font-medium text-green-600">{previewTransactions.length}</span>
                {" | "}
                {t("transactions.duplicates")}: <span className="font-medium text-yellow-600">{duplicateCount}</span>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-md">
                <p className="text-sm font-medium text-yellow-800">{t("transactions.parseWarnings")}:</p>
                <ul className="text-xs text-yellow-700 mt-1">
                  {parseErrors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filter + AI Categorize */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={t("transactions.search")}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                {filterText && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setFilterText("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiCategorize}
                disabled={aiLoading || previewTransactions.length === 0}
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {t("transactions.aiCategorize")}
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">{t("transactions.date")}</th>
                    <th className="text-left py-2 px-3">{t("transactions.description")}</th>
                    <th className="text-left py-2 px-3">{t("transactions.detail")}</th>
                    <th className="text-left py-2 px-3">{t("transactions.category")}</th>
                    <th className="text-right py-2 px-3">{t("transactions.amount")}</th>
                    <th className="text-center py-2 px-3">{t("transactions.transfer")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const i = previewTransactions.indexOf(tx)
                    return (
                    <tr key={i} className={`border-b ${tx.isTransfer ? "bg-blue-50" : ""}`}>
                      <td className="py-2 px-3 whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 px-3 max-w-[200px] truncate">{tx.description}</td>
                      <td className="py-2 px-3 max-w-[200px] truncate">{tx.detail}</td>
                      <td className="py-2 px-3">
                        <select
                          className="text-xs rounded border border-gray-200 px-1 py-0.5 max-w-[130px]"
                          value={tx.categoryId || ""}
                          onChange={(e) => updateCategory(i, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">—</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full transition-colors ${
                            tx.isTransfer
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                          onClick={() => toggleTransfer(i)}
                          title={tx.isTransfer ? t("transactions.transfer") : "Mark as transfer"}
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-1" />
                          {tx.isTransfer ? t("transactions.transfer") : "—"}
                        </button>
                      </td>
                    </tr>
                  )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                {t("transactions.back")}
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={previewTransactions.length === 0 || loading}
              >
                {loading ? t("transactions.importing") : `${t("transactions.confirmImport")} (${previewTransactions.length})`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium">{t("transactions.importComplete")}</p>
              <div className="flex justify-center space-x-6 text-sm">
                <div>
                  <span className="text-green-600 font-medium text-xl">{result.saved}</span>
                  <p className="text-gray-500">{t("transactions.saved")}</p>
                </div>
                <div>
                  <span className="text-yellow-600 font-medium text-xl">{result.duplicates}</span>
                  <p className="text-gray-500">{t("transactions.duplicatesIgnored")}</p>
                </div>
                {result.errors > 0 && (
                  <div>
                    <span className="text-red-600 font-medium text-xl">{result.errors}</span>
                    <p className="text-gray-500">{t("transactions.errors")}</p>
                  </div>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>
              {t("transactions.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
