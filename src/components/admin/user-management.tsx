"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  User as UserIcon,
  Eye
} from "lucide-react"
import { useTranslations } from "next-intl"
import { UserDialog } from "./user-dialog"
import { DeleteUserDialog } from "./delete-user-dialog"
import type { User } from "@/types"

export function UserManagement() {
  const t = useTranslations("settings")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [error, setError] = useState<string | null>(null)

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users)
    } catch (error) {
      console.error("Fetch users error:", error)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateUser = () => {
    setSelectedUser(null)
    setDialogMode("create")
    setShowUserDialog(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setDialogMode("edit")
    setShowUserDialog(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setShowDeleteDialog(true)
  }

  const handleSaveUser = async (userData: any) => {
    try {
      let response
      if (dialogMode === "create") {
        response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        })
      } else {
        response = await fetch(`/api/admin/users/${userData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save user")
      }

      await fetchUsers() // Refresh the users list
      setError(null)
    } catch (error) {
      console.error("Save user error:", error)
      setError(error instanceof Error ? error.message : "Failed to save user")
      throw error
    }
  }

  const handleConfirmDelete = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete user")
      }

      await fetchUsers() // Refresh the users list
      setError(null)
    } catch (error) {
      console.error("Delete user error:", error)
      setError(error instanceof Error ? error.message : "Failed to delete user")
      throw error
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "administrator":
        return <Shield className="h-4 w-4" />
      case "user":
        return <UserIcon className="h-4 w-4" />
      case "guest":
        return <Eye className="h-4 w-4" />
      default:
        return <UserIcon className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "administrator":
        return "destructive"
      case "user":
        return "default"
      case "guest":
        return "secondary"
      default:
        return "default"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("userManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            Loading users...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("userManagement")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("userManagementDescription")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t("createUser")}
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{t("userRole")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead className="w-[70px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t("noUsers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                          {getRoleIcon(user.role)}
                          {t(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("editUser")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("deleteUser")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
        onSave={handleSaveUser}
        mode={dialogMode}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}