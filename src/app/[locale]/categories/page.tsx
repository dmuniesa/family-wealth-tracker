"use client"

import { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { TransactionCategory, TransferRule, RuleType, RuleField } from "@/types"

const RULE_TYPE_LABELS: Record<string, string> = {
  contains_text: "typeContainsText",
  sender_is: "typeSenderIs",
  description_matches: "typeDescriptionMatches",
}

const FIELD_LABELS: Record<string, string> = {
  description: "fieldDescription",
  detail: "fieldDetail",
  observations: "fieldObservations",
  any: "fieldAny",
}

export default function CategoriesPage() {
  const t = useTranslations()

  // Categories state
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"income" | "expense" | "both" | "non_computable">("expense")
  const [formColor, setFormColor] = useState("#10B981")
  const [formIcon, setFormIcon] = useState("")
  const [formAiDescription, setFormAiDescription] = useState("")

  // Transfer rules state
  const [rules, setRules] = useState<TransferRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<TransferRule | null>(null)
  const [ruleSaving, setRuleSaving] = useState(false)
  const [formRuleType, setFormRuleType] = useState<RuleType>("contains_text")
  const [formPattern, setFormPattern] = useState("")
  const [formField, setFormField] = useState<RuleField>("any")

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

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/transfer-rules")
      if (res.ok) {
        setRules(await res.json())
      }
    } catch (err) {
      console.error("Failed to fetch transfer rules:", err)
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchRules()
  }, [fetchCategories, fetchRules])

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

  const ruleTypeColors: Record<string, string> = {
    contains_text: "bg-blue-100 text-blue-700",
    sender_is: "bg-purple-100 text-purple-700",
    description_matches: "bg-orange-100 text-orange-700",
  }

  // Category handlers
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

  // Transfer rule handlers
  const openCreateRule = () => {
    setEditingRule(null)
    setFormRuleType("contains_text")
    setFormPattern("")
    setFormField("any")
    setRuleDialogOpen(true)
  }

  const openEditRule = (rule: TransferRule) => {
    setEditingRule(rule)
    setFormRuleType(rule.rule_type)
    setFormPattern(rule.pattern)
    setFormField(rule.field)
    setRuleDialogOpen(true)
  }

  const handleSaveRule = async () => {
    if (!formPattern.trim()) return
    setRuleSaving(true)

    try {
      const body = {
        rule_type: formRuleType,
        pattern: formPattern.trim(),
        field: formField,
      }

      const res = editingRule
        ? await fetch(`/api/transactions/transfer-rules/${editingRule.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/transactions/transfer-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

      if (res.ok) {
        setRuleDialogOpen(false)
        fetchRules()
      }
    } catch (err) {
      console.error("Failed to save transfer rule:", err)
    } finally {
      setRuleSaving(false)
    }
  }

  const handleToggleRule = async (rule: TransferRule) => {
    const newActive = !rule.is_active
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newActive } : r))

    try {
      const res = await fetch(`/api/transactions/transfer-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (!res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
      }
    } catch {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
    }
  }

  const handleDeleteRule = async (rule: TransferRule) => {
    if (!confirm(t("transferRules.deleteConfirm"))) return

    try {
      await fetch(`/api/transactions/transfer-rules/${rule.id}`, { method: "DELETE" })
      fetchRules()
    } catch (err) {
      console.error("Failed to delete transfer rule:", err)
    }
  }

  const patternHelpKey: Record<string, string> = {
    contains_text: "patternHelpContains",
    sender_is: "patternHelpSender",
    description_matches: "patternHelpRegex",
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
        <Tabs defaultValue="categories" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("transactionCategories.title")}</h1>
              <p className="text-gray-600">{t("transactionCategories.subtitle")}</p>
            </div>
            <TabsList>
              <TabsTrigger value="categories">{t("transferRules.tabCategories")}</TabsTrigger>
              <TabsTrigger value="transfer-rules">{t("transferRules.tabTransferRules")}</TabsTrigger>
            </TabsList>
          </div>

          {/* ===== CATEGORIES TAB ===== */}
          <TabsContent value="categories">
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
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("transactionCategories.addCategory")}
                  </Button>
                </div>

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
                                  <span className="text-gray-300">&mdash;</span>
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

            {/* Category Create/Edit Dialog */}
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
          </TabsContent>

          {/* ===== TRANSFER RULES TAB ===== */}
          <TabsContent value="transfer-rules">
            {rulesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
                <p className="mt-2 text-gray-600">{t("transferRules.loading")}</p>
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-600 text-center mb-4">{t("transferRules.noRules")}</p>
                  <Button onClick={openCreateRule}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("transferRules.createRule")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={openCreateRule}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("transferRules.addRule")}
                  </Button>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4">{t("transferRules.ruleType")}</th>
                            <th className="text-left py-3 px-4">{t("transferRules.pattern")}</th>
                            <th className="text-left py-3 px-4">{t("transferRules.field")}</th>
                            <th className="text-center py-3 px-4">{t("transferRules.active")}</th>
                            <th className="text-center py-3 px-4">{}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rules.map((rule) => (
                            <tr key={rule.id} className={`border-b hover:bg-gray-50 ${!rule.is_active ? "opacity-50" : ""}`}>
                              <td className="py-3 px-4">
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${ruleTypeColors[rule.rule_type] || ""}`}>
                                  {t(`transferRules.${RULE_TYPE_LABELS[rule.rule_type]}`)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-mono text-xs max-w-[300px] truncate" title={rule.pattern}>
                                  {rule.pattern}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-xs text-gray-600">
                                  {t(`transferRules.${FIELD_LABELS[rule.field]}`)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Switch
                                  checked={rule.is_active}
                                  onCheckedChange={() => handleToggleRule(rule)}
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center space-x-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditRule(rule)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteRule(rule)}>
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
                  {rules.map((rule) => (
                    <Card key={rule.id} className={`hover:shadow-md ${!rule.is_active ? "opacity-50" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${ruleTypeColors[rule.rule_type] || ""}`}>
                                {t(`transferRules.${RULE_TYPE_LABELS[rule.rule_type]}`)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {t(`transferRules.${FIELD_LABELS[rule.field]}`)}
                              </span>
                            </div>
                            <p className="font-mono text-sm text-gray-900 truncate" title={rule.pattern}>
                              {rule.pattern}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Switch
                                checked={rule.is_active}
                                onCheckedChange={() => handleToggleRule(rule)}
                                className="scale-90"
                              />
                              <span className="text-xs text-gray-500">
                                {rule.is_active ? t("transferRules.active") : t("transferRules.inactive")}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditRule(rule)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteRule(rule)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Rule Create/Edit Dialog */}
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? t("transferRules.editRule") : t("transferRules.createRule")}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("transferRules.ruleType")}
                    </label>
                    <p className="text-xs text-gray-400 mb-1">{t("transferRules.ruleTypeHelp")}</p>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={formRuleType}
                      onChange={(e) => setFormRuleType(e.target.value as RuleType)}
                    >
                      <option value="contains_text">{t("transferRules.typeContainsText")}</option>
                      <option value="sender_is">{t("transferRules.typeSenderIs")}</option>
                      <option value="description_matches">{t("transferRules.typeDescriptionMatches")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("transferRules.pattern")}
                    </label>
                    <p className="text-xs text-gray-400 mb-1">
                      {t(`transferRules.${patternHelpKey[formRuleType]}`)}
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                      placeholder={t("transferRules.patternPlaceholder")}
                      value={formPattern}
                      onChange={(e) => setFormPattern(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("transferRules.field")}
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={formField}
                      onChange={(e) => setFormField(e.target.value as RuleField)}
                    >
                      <option value="description">{t("transferRules.fieldDescription")}</option>
                      <option value="detail">{t("transferRules.fieldDetail")}</option>
                      <option value="observations">{t("transferRules.fieldObservations")}</option>
                      <option value="any">{t("transferRules.fieldAny")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
                    {t("transferRules.cancel")}
                  </Button>
                  <Button onClick={handleSaveRule} disabled={!formPattern.trim() || ruleSaving}>
                    {ruleSaving ? t("transferRules.saving") : t("transferRules.save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </MainLayout>
    </AuthGuard>
  )
}
