"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
import type { User } from "@/types"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onConfirm: (userId: number) => Promise<void>
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm
}: DeleteUserDialogProps) {
  const t = useTranslations("settings")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!user) return
    
    setIsDeleting(true)
    try {
      await onConfirm(user.id)
      onOpenChange(false)
    } catch (error) {
      console.error("Delete user error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-red-600">
              {t("deleteUser")}
            </DialogTitle>
          </div>
          <DialogDescription className="space-y-2">
            <p>{t("deleteUserConfirm")}</p>
            {user && (
              <p className="font-medium">
                {user.name} ({user.email})
              </p>
            )}
            <p className="text-sm text-red-600 font-medium">
              {t("deleteUserWarning")}
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}