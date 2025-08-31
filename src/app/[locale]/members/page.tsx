"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  UserCheck, 
  UserX, 
  Trash2,
  Clock
} from "lucide-react"
import { useTranslations } from 'next-intl'

interface FamilyMember {
  id: number
  name: string
  email: string
  created_at: string
}

interface RegistrationSettings {
  enabled: boolean
}

export default function MembersPage() {
  const t = useTranslations()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    fetchMembers()
    fetchRegistrationSettings()
    fetchCurrentUser()
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrationSettings = async () => {
    try {
      const response = await fetch('/api/members/registration')
      if (response.ok) {
        const data = await response.json()
        setRegistrationEnabled(data.enabled || false)
      }
    } catch (error) {
      console.error('Failed to fetch registration settings:', error)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.user?.id)
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
    }
  }

  const toggleRegistration = async () => {
    try {
      const response = await fetch('/api/members/registration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !registrationEnabled }),
      })
      
      if (response.ok) {
        setRegistrationEnabled(!registrationEnabled)
      }
    } catch (error) {
      console.error('Failed to toggle registration:', error)
    }
  }

  const removeMember = async (memberId: number) => {
    if (memberId === currentUserId) {
      alert(t('members.cannotRemoveSelf'))
      return
    }

    if (!confirm(t('members.removeUserConfirm'))) return
    
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchMembers()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('members.loading')}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('members.title')}</h1>
              <p className="text-gray-600">{t('members.subtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('members.totalMembers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('members.familyMembersDescription')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('members.registrationStatus')}</CardTitle>
                {registrationEnabled ? (
                  <UserCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <UserX className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {registrationEnabled ? t('members.registrationEnabled') : t('members.registrationDisabled')}
                </div>
                <Button
                  size="sm"
                  variant={registrationEnabled ? "destructive" : "default"}
                  onClick={toggleRegistration}
                  className="mt-2"
                >
                  {registrationEnabled ? t('members.disableRegistration') : t('members.enableRegistration')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('members.familyMembersList')}</CardTitle>
              <CardDescription>
                {members.length === 0 ? t('members.noMembers') : `${members.length} family members`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('members.noMembers')}</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('members.memberName')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('members.memberEmail')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('members.memberJoined')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('members.memberActions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.name}
                            {member.id === currentUserId && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                You
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(member.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.id !== currentUserId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeMember(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}