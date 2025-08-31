"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Shield, 
  Download, 
  Upload, 
  Calendar, 
  Cloud, 
  Plus, 
  RotateCcw,
  Trash2,
  HardDrive,
  Clock
} from "lucide-react"
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BackupFile {
  id: string
  name: string
  size: number
  created_at: string
  location: 'local' | 'dropbox' | 'google-drive'
}

interface CloudStorageConfig {
  provider: 'dropbox' | 'google-drive'
  enabled: boolean
  connected: boolean
}

export default function BackupsPage() {
  const t = useTranslations()
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('off')
  const [scheduleTime, setScheduleTime] = useState<string>('02:00')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [nextScheduled, setNextScheduled] = useState<string | null>(null)
  const [cloudConfigs, setCloudConfigs] = useState<CloudStorageConfig[]>([])
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  useEffect(() => {
    fetchBackups()
    fetchBackupSettings()
    fetchCloudConfigs()
  }, [])

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/backups')
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups || [])
        setLastBackup(data.lastBackup)
        setNextScheduled(data.nextScheduled)
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBackupSettings = async () => {
    try {
      const response = await fetch('/api/backups/schedule')
      if (response.ok) {
        const data = await response.json()
        setScheduleFrequency(data.frequency || 'off')
        setScheduleTime(data.time || '02:00')
        setNextScheduled(data.nextRun)
      }
    } catch (error) {
      console.error('Failed to fetch backup settings:', error)
    }
  }

  const fetchCloudConfigs = async () => {
    try {
      const response = await fetch('/api/cloud-storage')
      if (response.ok) {
        const configs = await response.json()
        setCloudConfigs(configs)
      }
    } catch (error) {
      console.error('Failed to fetch cloud configs:', error)
    }
  }

  const connectCloudStorage = async (provider: 'dropbox' | 'google-drive') => {
    setIsConnecting(provider)
    try {
      const response = await fetch(`/api/auth/${provider}`)
      if (response.ok) {
        const { authUrl } = await response.json()
        window.location.href = authUrl
      }
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error)
      setIsConnecting(null)
    }
  }

  const toggleCloudStorage = async (provider: 'dropbox' | 'google-drive', enabled: boolean) => {
    try {
      const response = await fetch('/api/cloud-storage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, enabled }),
      })
      
      if (response.ok) {
        await fetchCloudConfigs()
      }
    } catch (error) {
      console.error(`Failed to toggle ${provider}:`, error)
    }
  }

  const createBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        await fetchBackups()
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const updateSchedule = async (frequency: string, time?: string) => {
    try {
      const scheduleTime = time || scheduleTime
      const response = await fetch('/api/backups/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frequency, time: scheduleTime }),
      })
      
      if (response.ok) {
        setScheduleFrequency(frequency)
        setScheduleTime(scheduleTime)
        await fetchBackups() // Only refresh backups data
    } catch (error) {
      console.error('Failed to update schedule:', error)
    }
  }

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/backups/${backupId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `wealth-backup-${backupId}.db`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download backup:', error)
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (!confirm(t('backups.restoreConfirm'))) return
    
    try {
      const response = await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm(t('backups.deleteConfirm'))) return
    
    try {
      const response = await fetch(`/api/backups/${backupId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchBackups()
      }
    } catch (error) {
      console.error('Failed to delete backup:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'dropbox':
        return <Cloud className="h-4 w-4 text-blue-600" />
      case 'google-drive':
        return <Cloud className="h-4 w-4 text-green-600" />
      default:
        return <HardDrive className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('backups.loading')}</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('backups.title')}</h1>
              <p className="text-gray-600">{t('backups.subtitle')}</p>
            </div>
            <Button onClick={createBackup} disabled={isCreatingBackup} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {isCreatingBackup ? t('backups.backupInProgress') : t('backups.createBackup')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('backups.manualBackup')}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{backups.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('backups.manualBackupDescription')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('backups.lastBackup')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {lastBackup ? formatDate(lastBackup) : 'Never'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('backups.nextScheduled')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {nextScheduled ? formatDate(nextScheduled) : t('backups.scheduleOff')}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t('backups.scheduledBackups')}</CardTitle>
                <CardDescription>{t('backups.scheduledBackupsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Backup Frequency</label>
                    {!loading && (
                      <Select value={scheduleFrequency} onValueChange={updateSchedule}>
                        <SelectTrigger>
                          <SelectValue>
                            {scheduleFrequency === 'off' && t('backups.scheduleOff')}
                            {scheduleFrequency === 'daily' && t('backups.scheduleDaily')}
                            {scheduleFrequency === 'weekly' && t('backups.scheduleWeekly')}
                            {scheduleFrequency === 'monthly' && t('backups.scheduleMonthly')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">{t('backups.scheduleOff')}</SelectItem>
                          <SelectItem value="daily">{t('backups.scheduleDaily')}</SelectItem>
                          <SelectItem value="weekly">{t('backups.scheduleWeekly')}</SelectItem>
                          <SelectItem value="monthly">{t('backups.scheduleMonthly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {loading && (
                      <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                    )}
                  </div>
                  
                  {scheduleFrequency !== 'off' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Backup Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => {
                          setScheduleTime(e.target.value)
                          updateSchedule(scheduleFrequency, e.target.value)
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{t('backups.cloudStorage')}</CardTitle>
                <CardDescription>{t('backups.cloudStorageDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cloudConfigs.map((config) => {
                  const isDropbox = config.provider === 'dropbox'
                  const isGoogleDrive = config.provider === 'google-drive'
                  const isConnectingThis = isConnecting === config.provider
                  
                  return (
                    <div key={config.provider} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Cloud className={`h-5 w-5 ${isDropbox ? 'text-blue-600' : 'text-green-600'}`} />
                        <div>
                          <div className="font-medium">
                            {isDropbox ? 'Dropbox' : 'Google Drive'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {config.connected ? t('backups.connected') : t('backups.notConnected')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {config.connected ? (
                          <>
                            <Button
                              size="sm"
                              variant={config.enabled ? "default" : "outline"}
                              onClick={() => toggleCloudStorage(config.provider, !config.enabled)}
                            >
                              {config.enabled ? t('backups.enabled') : t('backups.disabled')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => connectCloudStorage(config.provider)}
                            disabled={isConnectingThis}
                          >
                            {isConnectingThis ? t('backups.connecting') : t('backups.connect')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {cloudConfigs.length === 0 && (
                  <div className="text-center py-4">
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => connectCloudStorage('dropbox')}
                        disabled={isConnecting === 'dropbox'}
                      >
                        <Cloud className="mr-2 h-4 w-4 text-blue-600" />
                        {isConnecting === 'dropbox' ? t('backups.connecting') : t('backups.enableDropbox')}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => connectCloudStorage('google-drive')}
                        disabled={isConnecting === 'google-drive'}
                      >
                        <Cloud className="mr-2 h-4 w-4 text-green-600" />
                        {isConnecting === 'google-drive' ? t('backups.connecting') : t('backups.enableGoogleDrive')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{t('backups.backupHistory')}</CardTitle>
              <CardDescription>
                {backups.length === 0 ? t('backups.createFirstBackup') : `${backups.length} backups available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('backups.noBackups')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('backups.createFirstBackup')}</p>
                  <div className="mt-6">
                    <Button onClick={createBackup} disabled={isCreatingBackup}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('backups.createBackup')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('backups.backupName')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('backups.backupSize')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('backups.backupDate')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('backups.backupLocation')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('backups.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {backup.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(backup.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(backup.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              {getLocationIcon(backup.location)}
                              <span className="capitalize">{backup.location.replace('-', ' ')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadBackup(backup.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreBackup(backup.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteBackup(backup.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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