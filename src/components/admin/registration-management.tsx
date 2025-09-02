"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, UserX, Settings } from "lucide-react"
import { useTranslations } from 'next-intl'

export function RegistrationManagement() {
  const t = useTranslations()
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRegistrationSettings()
  }, [])

  const fetchRegistrationSettings = async () => {
    try {
      const response = await fetch('/api/members/registration')
      if (response.ok) {
        const data = await response.json()
        setRegistrationEnabled(data.enabled || false)
      }
    } catch (error) {
      console.error('Failed to fetch registration settings:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading registration settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Registration Settings</h2>
        <p className="text-gray-600 text-sm">
          Control whether new users can register for accounts on this system.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">{t('members.registrationStatus')}</CardTitle>
            <CardDescription>
              {registrationEnabled ? 
                "New users can register for accounts" : 
                "Registration is currently disabled"
              }
            </CardDescription>
          </div>
          {registrationEnabled ? (
            <UserCheck className="h-5 w-5 text-green-600" />
          ) : (
            <UserX className="h-5 w-5 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium mb-1">
                {registrationEnabled ? t('members.registrationEnabled') : t('members.registrationDisabled')}
              </div>
              <p className="text-xs text-gray-500">
                {registrationEnabled ? 
                  "Anyone with the registration link can create an account" : 
                  "Only administrators can add new users"
                }
              </p>
            </div>
            <Button
              size="sm"
              variant={registrationEnabled ? "destructive" : "default"}
              onClick={toggleRegistration}
              className="ml-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              {registrationEnabled ? t('members.disableRegistration') : t('members.enableRegistration')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}