"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Globe, Copy, Users, Upload, Shield } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from "@/types"

export default function SettingsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [selectedLanguage, setSelectedLanguage] = useState(locale)
  const [user, setUser] = useState<User | null>(null)
  const [newFamilyId, setNewFamilyId] = useState("")
  const [isChangingFamily, setIsChangingFamily] = useState(false)
  const [familyChangeMessage, setFamilyChangeMessage] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      }
    }

    fetchUser()
  }, [])

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `wealth-tracker-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleLanguageChange = (newLocale: string) => {
    setSelectedLanguage(newLocale)
    // Store preference in localStorage
    localStorage.setItem('preferred-locale', newLocale)
    // Set locale cookie for middleware
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    
    // Navigate to the new locale - always go to settings page
    window.location.href = `/${newLocale}/settings`
  }

  const handleCopyFamilyId = async () => {
    if (user?.family_id) {
      try {
        await navigator.clipboard.writeText(user.family_id.toString())
        setCopyMessage(t('settings.familyIdCopied'))
        // Clear the message after 2 seconds
        setTimeout(() => setCopyMessage(null), 2000)
      } catch (error) {
        console.error('Failed to copy Family ID:', error)
        setCopyMessage(t('settings.failedToCopy'))
        setTimeout(() => setCopyMessage(null), 3000)
      }
    }
  }

  const handleChangeFamilyId = async () => {
    if (!newFamilyId || !user) return
    
    setIsChangingFamily(true)
    setFamilyChangeMessage(null)

    try {
      const response = await fetch('/api/auth/change-family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newFamilyId: parseInt(newFamilyId)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Family ID does not exist') {
          setFamilyChangeMessage(t('settings.familyIdNotExists'))
        } else if (data.error === 'You are already in this family') {
          setFamilyChangeMessage(t('settings.sameFamily'))
        } else {
          setFamilyChangeMessage(data.error || t('common.error'))
        }
      } else {
        setFamilyChangeMessage(t('settings.familyIdChanged'))
        setNewFamilyId("")
        // Refresh user data
        const userResponse = await fetch('/api/auth/me')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUser(userData.user)
        }
      }
    } catch (error) {
      setFamilyChangeMessage(t('common.error'))
    } finally {
      setIsChangingFamily(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFile(file || null)
    setImportMessage(null)
  }

  const handleImportCsv = async () => {
    if (!selectedFile) return
    
    setIsImporting(true)
    setImportMessage(null)

    try {
      const formData = new FormData()
      formData.append('csvFile', selectedFile)

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setImportMessage(`${t('settings.csvFormatError')}: ${data.details.slice(0, 3).join(', ')}`)
        } else {
          setImportMessage(data.error || t('settings.importError'))
        }
      } else {
        const { results } = data
        setImportMessage(
          `${t('settings.importSuccess')} ${results.successful} successful, ${results.failed} failed.`
        )
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById('csvFileInput') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (error) {
      setImportMessage(t('settings.importError'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) return
    
    setIsChangingPassword(true)
    setPasswordChangeMessage(null)

    // Client-side validation
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage(t('settings.passwordsDoNotMatch'))
      setIsChangingPassword(false)
      return
    }

    if (newPassword.length < 8) {
      setPasswordChangeMessage(t('settings.passwordTooShort'))
      setIsChangingPassword(false)
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Current password is incorrect') {
          setPasswordChangeMessage(t('settings.incorrectCurrentPassword'))
        } else {
          setPasswordChangeMessage(data.error || t('common.error'))
        }
      } else {
        setPasswordChangeMessage(t('settings.passwordChanged'))
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      }
    } catch (error) {
      setPasswordChangeMessage(t('common.error'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                {t('settings.language')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.languageDescription')}
              </p>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('languages.english')}</SelectItem>
                  <SelectItem value="es">{t('languages.spanish')}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.dataExport')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.exportDescription')}
              </p>
              <Button onClick={handleExportData} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {t('settings.exportToCsv')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.familyInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.familyIdDescription')}
              </p>
              <div className="bg-gray-50 p-3 rounded font-mono text-sm flex items-center justify-between">
                <span>
                  {t('settings.familyId')}: {user?.family_id || 'Loading...'}
                </span>
                {user?.family_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyFamilyId}
                    className="h-8 w-8 p-0"
                    title={t('settings.copyFamilyId')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {copyMessage && (
                <div className="mt-2 text-sm text-green-600 font-medium">
                  {copyMessage}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {t('settings.changeFamilyId')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.changeFamilyIdDescription')}
              </p>
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder={t('settings.newFamilyIdPlaceholder')}
                  value={newFamilyId}
                  onChange={(e) => setNewFamilyId(e.target.value)}
                />
                <Button 
                  onClick={handleChangeFamilyId} 
                  disabled={!newFamilyId || isChangingFamily}
                  className="w-full"
                >
                  {isChangingFamily ? t('settings.changingFamily') : t('settings.changeFamilyId')}
                </Button>
                {familyChangeMessage && (
                  <div className={`text-sm p-3 rounded ${
                    familyChangeMessage === t('settings.familyIdChanged') 
                      ? 'text-green-700 bg-green-50' 
                      : 'text-red-700 bg-red-50'
                  }`}>
                    {familyChangeMessage}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                {t('settings.security')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.securityDescription')}
              </p>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">{t('settings.changePassword')}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings.changePasswordDescription')}
                </p>
                
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={t('settings.currentPasswordPlaceholder')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('settings.newPasswordPlaceholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('settings.confirmPasswordPlaceholder')}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                  
                  <Button 
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmNewPassword || isChangingPassword}
                    className="w-full"
                  >
                    {isChangingPassword ? t('settings.changingPassword') : t('settings.changePassword')}
                  </Button>
                  
                  {passwordChangeMessage && (
                    <div className={`text-sm p-3 rounded ${
                      passwordChangeMessage === t('settings.passwordChanged')
                        ? 'text-green-700 bg-green-50' 
                        : 'text-red-700 bg-red-50'
                    }`}>
                      {passwordChangeMessage}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                {t('settings.dataManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('settings.dataManagementDescription')}
              </p>
              
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      {t('settings.importCsvDescription')}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {t('settings.csvExample')}
                    </p>
                    <input
                      id="csvFileInput"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('csvFileInput')?.click()}
                      className="mb-2"
                    >
                      {t('settings.selectCsvFile')}
                    </Button>
                    {selectedFile && (
                      <p className="text-sm text-gray-700">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleImportCsv}
                  disabled={!selectedFile || isImporting}
                  className="w-full"
                >
                  {isImporting ? t('settings.importing') : t('settings.importData')}
                </Button>
                
                {importMessage && (
                  <div className={`text-sm p-3 rounded ${
                    importMessage.includes(t('settings.importSuccess'))
                      ? 'text-green-700 bg-green-50' 
                      : 'text-red-700 bg-red-50'
                  }`}>
                    {importMessage}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
    </AuthGuard>
  )
}