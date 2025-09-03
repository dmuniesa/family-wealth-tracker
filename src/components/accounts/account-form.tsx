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
  FormDescription,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { ibanSchema, optionalIbanSchema, currencySchema } from "@/lib/validation"

// Create schema function to accept translated messages
const createAccountSchema = (t: any, category?: string) => z.object({
  name: z.string().min(1, t('forms.required')),
  category: z.enum(["Banking", "Investment", "Debt"]),
  currency: currencySchema,
  iban: category === 'Debt' ? optionalIbanSchema : ibanSchema,
  notes: z.string().optional(),
  // Debt amortization fields
  aprRate: z.number().min(0).max(1).optional(),
  monthlyPayment: z.number().min(0).optional(),
  loanTermMonths: z.number().min(1).optional(),
  paymentType: z.enum(["fixed", "interest_only"]).optional(),
  autoUpdateEnabled: z.boolean().optional(),
  originalBalance: z.number().min(0).optional(),
  loanStartDate: z.string().optional(),
})

type AccountFormValues = {
  name: string
  category: "Banking" | "Investment" | "Debt"
  currency: "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD"
  iban?: string
  notes?: string
  // Debt amortization fields
  aprRate?: number
  monthlyPayment?: number
  loanTermMonths?: number
  paymentType?: "fixed" | "interest_only"
  autoUpdateEnabled?: boolean
  originalBalance?: number
  loanStartDate?: string
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
      // Debt amortization defaults
      aprRate: (initialData as any)?.apr_rate || undefined,
      monthlyPayment: (initialData as any)?.monthly_payment || undefined,
      loanTermMonths: (initialData as any)?.loan_term_months || undefined,
      paymentType: (initialData as any)?.payment_type || "fixed",
      autoUpdateEnabled: (initialData as any)?.auto_update_enabled || false,
      originalBalance: (initialData as any)?.original_balance || undefined,
      loanStartDate: (initialData as any)?.loan_start_date || "",
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {watchedCategory === 'Debt' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('debt.amortizationSettings')}
                </div>
                
                <FormField
                  control={form.control}
                  name="aprRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('debt.aprRate')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001"
                          min="0"
                          max="1"
                          placeholder="0.05" 
                          name={field.name}
                          value={field.value ?? ''}
                          onBlur={field.onBlur}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '' || value === null) {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(value)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>{t('debt.aprRateDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="originalBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('debt.originalBalance')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="10000.00" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loanTermMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('debt.loanTermMonths')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="360" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('debt.monthlyPayment')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="500.00" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>{t('debt.monthlyPaymentDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loanStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('debt.loanStartDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('debt.paymentType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('debt.selectPaymentType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">{t('debt.fixedPayment')}</SelectItem>
                          <SelectItem value="interest_only">{t('debt.interestOnly')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('debt.paymentTypeDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoUpdateEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('debt.autoUpdateEnabled')}</FormLabel>
                        <FormDescription>{t('debt.autoUpdateDescription')}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

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