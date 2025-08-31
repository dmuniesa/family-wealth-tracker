"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from 'next-intl'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ibanSchema, optionalIbanSchema, currencySchema } from "@/lib/validation"

// Create schema function to accept translated messages
const createAccountSchema = (t: any, category?: string) => z.object({
  name: z.string().min(1, t('forms.required')),
  category: z.enum(["Banking", "Investment", "Debt"]),
  currency: currencySchema,
  iban: category === 'Debt' ? optionalIbanSchema : ibanSchema,
  notes: z.string().optional(),
})

type AccountFormValues = {
  name: string
  category: "Banking" | "Investment" | "Debt"
  currency: "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD"
  iban?: string
  notes?: string
}

interface AccountFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Partial<AccountFormValues & { id: number }>
  isEdit?: boolean
}

export function AccountForm({ onSuccess, onCancel, initialData, isEdit = false }: AccountFormProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AccountFormValues>({
    defaultValues: {
      name: initialData?.name || "",
      category: initialData?.category || "Banking",
      currency: initialData?.currency || "EUR",
      iban: initialData?.iban || "",
      notes: initialData?.notes || "",
    },
  })

  const watchedCategory = form.watch('category')

  async function onSubmit(values: AccountFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      // Validate IBAN requirement based on category
      if (values.category !== 'Debt' && (!values.iban || values.iban.trim() === '')) {
        setError('IBAN is required for Banking and Investment accounts')
        setIsLoading(false)
        return
      }

      const url = isEdit ? `/api/accounts/${initialData?.id}` : '/api/accounts'
      const method = isEdit ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('common.error'))
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isEdit ? t('accounts.editAccount') : t('accounts.addAccount')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accounts.accountName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('forms.accountNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accounts.category')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('forms.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Banking">{t('categories.banking')}</SelectItem>
                      <SelectItem value="Investment">{t('categories.investment')}</SelectItem>
                      <SelectItem value="Debt">{t('categories.debt')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accounts.currency')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('forms.selectCurrency')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EUR">{t('currencies.eur')}</SelectItem>
                      <SelectItem value="USD">{t('currencies.usd')}</SelectItem>
                      <SelectItem value="GBP">{t('currencies.gbp')}</SelectItem>
                      <SelectItem value="CHF">{t('currencies.chf')}</SelectItem>
                      <SelectItem value="JPY">{t('currencies.jpy')}</SelectItem>
                      <SelectItem value="CAD">{t('currencies.cad')}</SelectItem>
                      <SelectItem value="AUD">{t('currencies.aud')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedCategory !== 'Debt' && (
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.iban')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('forms.ibanPlaceholder')} 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accounts.notes')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('accounts.notesPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (isEdit ? t('accounts.updating') : t('accounts.creating')) : (isEdit ? t('accounts.updateAccount') : t('accounts.createAccount'))}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t('accounts.cancel')}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}