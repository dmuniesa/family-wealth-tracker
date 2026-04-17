"use client"

import { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { TransactionCategory } from "@/types"

export default function CategoriesPage() {
  const t = useTranslations()

  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"income" | "expense" | "both" | "non_computable">("expense")
  const [formColor, setFormColor] = useState("#10B981")
  const [formIcon, setFormIcon] = useState("")
  const [formAiDescription, setFormAiDescription] = useState("")

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/categories")
      if (res.ok) {
        setCategories(await res.json())
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const typeColors: Record<string, string> = {
    expense: "bg-red-100 text-red-700",
    income: "bg-green-100 text-green-700",
    both: "bg-blue-100 text-blue-700",
    non_computable: "bg-gray-100 text-gray-700",
  }

  const typeLabels: Record<string, string> = {
    expense: t("transactionCategories.typeExpense"),
    income: t("transactionCategories.typeIncome"),
    both: t("transactionCategories.typeBoth"),
    non_computable: t("transactionCategories.typeNonComputable"),
  }

  const openCreate = () => {
    setEditingCategory(null)
    setFormName("")
    setFormType("expense")
    setFormColor("#10B981")
    setFormIcon("")
    setFormAiDescription("")
    setDialogOpen(true)
  }

  const openEdit = (cat: TransactionCategory) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormType(cat.type)
    setFormColor(cat.color || "#10B981")
    setFormIcon(cat.icon || "")
    setFormAiDescription(cat.ai_description || "")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)

    try {
      const body = {
        name: formName.trim(),
        type: formType,
        color: formColor,
        icon: formIcon || null,
        ai_description: formAiDescription || null,
      }

      const res = editingCategory
        ? await fetch(`/api/transactions/categories/${editingCategory.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/transactions/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

      if (res.ok) {
        setDialogOpen(false)
        fetchCategories()
      }
    } catch (err) {
      console.error("Failed to save category:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: TransactionCategory) => {
    const msg = cat.is_system
      ? `${t("transactionCategories.deleteConfirm")} ${t("transactionCategories.deleteWarning")}`
      : t("transactionCategories.deleteConfirm")
    if (!confirm(msg)) return

    try {
      await fetch(`/api/transactions/categories/${cat.id}`, { method: "DELETE" })
      fetchCategories()
    } catch (err) {
      console.error("Failed to delete category:", err)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-gray-600">{t("transactionCategories.loading")}</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("transactionCategories.title")}</h1>
              <p className="text-gray-600">{t("transactionCategories.subtitle")}</p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              {t("transactionCategories.addCategory")}
            </Button>
          </div>

          {/* Categories table */}
          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-600 text-center mb-4">{t("transactionCategories.noCategories")}</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("transactionCategories.createCategory")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4">{t("transactionCategories.color")}</th>
                          <th className="text-left py-3 px-4">{t("transactionCategories.name")}</th>
                          <th className="text-left py-3 px-4">{t("transactionCategories.type")}</th>
                          <th className="text-left py-3 px-4">{t("transactionCategories.aiDescription")}</th>
                          <th className="text-center py-3 px-4">{t("transactionCategories.system")}/{t("transactionCategories.custom")}</th>
                          <th className="text-center py-3 px-4">{}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => (
                          <tr key={cat.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: cat.color || "#9CA3AF" }} />
                            </td>
                            <td className="py-3 px-4 font-medium">{cat.name}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${typeColors[cat.type] || ""}`}>
                                {typeLabels[cat.type] || cat.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-[300px]">
                              {cat.ai_description ? (
                                <p className="text-gray-500 text-xs truncate" title={cat.ai_description}>
                                  {cat.ai_description}
                                </p>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${cat.is_system ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"}`}>
                                {cat.is_system ? t("transactionCategories.system") : t("transactionCategories.custom")}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(cat)}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {categories.map((cat) => (
                  <Card key={cat.id} className="hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: cat.color || "#9CA3AF" }} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{cat.name}</p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[cat.type] || ""}`}>
                                {typeLabels[cat.type] || cat.type}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${cat.is_system ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"}`}>
                                {cat.is_system ? t("transactionCategories.system") : t("transactionCategories.custom")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(cat)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {cat.ai_description && (
                        <p className="text-xs text-gray-500 mt-2 pl-11">{cat.ai_description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory
                    ? t("transactionCategories.editCategory")
                    : t("transactionCategories.createCategory")}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("transactionCategories.name")}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder={t("transactionCategories.namePlaceholder")}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("transactionCategories.type")}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as typeof formType)}
                  >
                    <option value="expense">{t("transactionCategories.typeExpense")}</option>
                    <option value="income">{t("transactionCategories.typeIncome")}</option>
                    <option value="both">{t("transactionCategories.typeBoth")}</option>
                    <option value="non_computable">{t("transactionCategories.typeNonComputable")}</option>
                  </select>
                </div>

                {/* Color + Icon row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("transactionCategories.color")}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                      />
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: formColor }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("transactionCategories.icon")}
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="ShoppingCart"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                    />
                  </div>
                </div>

                {/* AI Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("transactionCategories.aiDescription")}
                  </label>
                  <p className="text-xs text-gray-400 mb-1">{t("transactionCategories.aiDescriptionHelp")}</p>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                    placeholder="e.g., Supermarket purchases, food stores, Mercadona, Lidl..."
                    value={formAiDescription}
                    onChange={(e) => setFormAiDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("transactionCategories.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={!formName.trim() || saving}>
                  {saving ? t("transactionCategories.saving") : t("transactionCategories.save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}
