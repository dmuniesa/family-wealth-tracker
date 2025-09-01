"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Mail, Users, Shield } from "lucide-react"
import { useTranslations } from 'next-intl'
import { UserManagement } from "@/components/admin/user-management"

// Import the notifications component (we'll need to extract it)
import { NotificationManagement } from "@/components/admin/notification-management"

function AdminContent() {
  const t = useTranslations("navigation")
  const tSettings = useTranslations("settings")
  
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t("admin")}</h1>
            <p className="text-muted-foreground">
              Administrative settings and user management
            </p>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {tSettings("notifications")}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {tSettings("users")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <NotificationManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard requireRole="administrator">
      <MainLayout>
        <AdminContent />
      </MainLayout>
    </AuthGuard>
  )
}