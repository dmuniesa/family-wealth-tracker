"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import type { User, UserRole } from "@/types"

const baseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["administrator", "user", "guest"]),
})

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(8),
})

const editUserSchema = baseUserSchema.extend({
  password: z.string().refine(
    (val) => val === "" || val.length >= 8,
    { message: "Password must be at least 8 characters or empty" }
  ),
})

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onSave: (userData: any) => Promise<void>
  mode: "create" | "edit"
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSave,
  mode
}: UserDialogProps) {
  const t = useTranslations("settings")
  const tAuth = useTranslations("auth")
  const [isLoading, setIsLoading] = useState(false)
  
  // Use a unified schema that works for both create and edit modes
  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "user",
      password: "",
    },
  })

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      if (user && mode === "edit") {
        form.reset({
          email: user.email,
          name: user.name,
          role: user.role,
          password: "", // Don't show existing password
        })
      } else {
        form.reset({
          email: "",
          name: "",
          role: "user",
          password: "",
        })
      }
    }
  }, [user, mode, open, form])

  const onSubmit = async (data: z.infer<typeof editUserSchema>) => {
    setIsLoading(true)
    try {
      if (mode === "edit" && user) {
        const updateData: any = {
          id: user.id,
          email: data.email,
          name: data.name,
          role: data.role,
        }
        // Only include password if it's provided
        if (data.password) {
          updateData.password = data.password
        }
        await onSave(updateData)
      } else {
        // Create mode - password is required
        if (!data.password || data.password.length < 8) {
          form.setError("password", { 
            type: "manual", 
            message: "Password is required and must be at least 8 characters" 
          })
          return
        }
        await onSave({
          email: data.email,
          name: data.name,
          role: data.role,
          password: data.password,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Save user error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createUser") : t("editUser")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{tAuth("email")}</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-red-500" : ""}
              />
              {form.formState.errors.email && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">{tAuth("name")}</Label>
              <Input
                id="name"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-red-500" : ""}
              />
              {form.formState.errors.name && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">{t("userRole")}</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value: UserRole) => form.setValue("role", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("userRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">{t("administrator")}</SelectItem>
                  <SelectItem value="user">{t("user")}</SelectItem>
                  <SelectItem value="guest">{t("guest")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                {mode === "create" ? tAuth("password") : t("newPassword")}
                {mode === "edit" && " (optional)"}
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                className={form.formState.errors.password ? "border-red-500" : ""}
                placeholder={mode === "edit" ? "Leave empty to keep current password" : ""}
              />
              {form.formState.errors.password && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}