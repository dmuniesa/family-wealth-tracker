"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Send, 
  Settings, 
  History, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Zap
} from "lucide-react"
import { useTranslations } from 'next-intl'
import type { User } from "@/types"
import { ResendConfig } from "./resend-config"

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface NotificationSettings {
  enabled: boolean;
  day: string;
  time: string;
  timezone: string;
  includeCharts: boolean;
  customMessage?: string;
}

interface NotificationHistory {
  id: string;
  familyId: number;
  sentAt: string;
  success: boolean;
  error?: string;
  recipients: string[];
  reportPeriod: {
    start: string;
    end: string;
  };
}

export function NotificationManagement() {
  const t = useTranslations()
  const [user, setUser] = useState<User | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    from: ''
  })
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    day: 'sunday',
    time: '09:00',
    timezone: 'UTC',
    includeCharts: true,
    customMessage: ''
  })
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [isConfigured, setIsConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [emailProviders, setEmailProviders] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchUser()
    fetchConfig()
    fetchHistory()
    fetchEmailProviders()
  }, [])

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

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/notifications/config')
      if (response.ok) {
        const data = await response.json()
        if (data.emailConfig) {
          setEmailConfig(data.emailConfig)
        }
        setNotificationSettings(data.notificationSettings)
        setIsConfigured(data.isConfigured)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/admin/notifications/history')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }

  const fetchEmailProviders = async () => {
    try {
      const response = await fetch('/api/admin/email/providers')
      if (response.ok) {
        const data = await response.json()
        setEmailProviders(data)
      }
    } catch (error) {
      console.error('Failed to fetch email providers:', error)
    }
  }

  const saveNotificationSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationSettings
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Schedule saved successfully' })
        fetchConfig()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save schedule' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const saveEmailConfig = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailConfig
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'SMTP configuration saved successfully' })
        setIsConfigured(true)
        fetchConfig()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save SMTP configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const sendTestEmail = async (type: 'connection' | 'weekly-report') => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' })
      return
    }

    setTesting(true)
    setMessage(null)
    
    try {
      const payload: any = {
        type,
        email: testEmail
      }

      if (type === 'weekly-report' && user) {
        payload.familyId = user.family_id
      }

      const response = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        const providerText = data.provider ? ` via ${data.provider}` : ''
        setMessage({ type: 'success', text: data.message || `Test email sent successfully${providerText}` })
        // Refresh provider status after successful send
        fetchEmailProviders()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setTesting(false)
    }
  }

  const sendWeeklyReports = async () => {
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allFamilies: true })
      })

      if (response.ok) {
        const activeProvider = emailProviders?.activeProvider
        const providerText = activeProvider ? ` via ${activeProvider}` : ''
        setMessage({ type: 'success', text: `Weekly reports sent to all families${providerText}` })
        fetchHistory()
        fetchEmailProviders()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send weekly reports' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    }
  }

  const clearHistory = async () => {
    try {
      const response = await fetch('/api/admin/notifications/history', {
        method: 'DELETE'
      })

      if (response.ok) {
        setHistory([])
        setMessage({ type: 'success', text: 'History cleared successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to clear history' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading notification settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <Tabs defaultValue="schedule" className="w-full" onValueChange={() => { fetchEmailProviders() }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="schedule">
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="resend">
            <Zap className="h-4 w-4 mr-2" />
            Resend
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test & Send
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Report Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications-enabled"
                  checked={notificationSettings.enabled}
                  onCheckedChange={(checked) => setNotificationSettings({
                    ...notificationSettings,
                    enabled: checked
                  })}
                />
                <Label htmlFor="notifications-enabled">Enable weekly email notifications</Label>
              </div>

              {notificationSettings.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="day">Day of Week</Label>
                      <Select
                        value={notificationSettings.day}
                        onValueChange={(value) => setNotificationSettings({
                          ...notificationSettings,
                          day: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={notificationSettings.time}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          time: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={notificationSettings.timezone}
                      onValueChange={(value) => setNotificationSettings({
                        ...notificationSettings,
                        timezone: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-charts"
                      checked={notificationSettings.includeCharts}
                      onCheckedChange={(checked) => setNotificationSettings({
                        ...notificationSettings,
                        includeCharts: checked
                      })}
                    />
                    <Label htmlFor="include-charts">Include charts in emails</Label>
                  </div>

                  <div>
                    <Label htmlFor="custom-message">Custom Message (optional)</Label>
                    <Textarea
                      id="custom-message"
                      value={notificationSettings.customMessage || ''}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        customMessage: e.target.value
                      })}
                      placeholder="Add a personal message to weekly reports..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Server Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig({...emailConfig, host: e.target.value})}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={emailConfig.port}
                    onChange={(e) => setEmailConfig({...emailConfig, port: parseInt(e.target.value) || 587})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="user">Email Address</Label>
                <Input
                  id="user"
                  type="email"
                  value={emailConfig.auth.user}
                  onChange={(e) => setEmailConfig({
                    ...emailConfig, 
                    auth: {...emailConfig.auth, user: e.target.value}
                  })}
                  placeholder="your-email@gmail.com"
                />
              </div>
              
              <div>
                <Label htmlFor="pass">Password / App Password</Label>
                <Input
                  id="pass"
                  type="password"
                  value={emailConfig.auth.pass}
                  onChange={(e) => setEmailConfig({
                    ...emailConfig, 
                    auth: {...emailConfig.auth, pass: e.target.value}
                  })}
                  placeholder="Enter password or app-specific password"
                />
              </div>
              
              <div>
                <Label htmlFor="from">From Address</Label>
                <Input
                  id="from"
                  value={emailConfig.from}
                  onChange={(e) => setEmailConfig({...emailConfig, from: e.target.value})}
                  placeholder="Family Wealth Tracker <noreply@yourdomain.com>"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={emailConfig.secure}
                  onCheckedChange={(checked) => setEmailConfig({...emailConfig, secure: checked})}
                />
                <Label htmlFor="secure">Use SSL/TLS (recommended for port 465)</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveEmailConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save SMTP Configuration'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="resend" className="space-y-6">
          <ResendConfig />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          {/* Email Provider Status */}
          {emailProviders && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Email Provider Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {emailProviders.providers.map((provider: any) => (
                    <div 
                      key={provider.provider}
                      className={`p-3 rounded-lg border ${
                        provider.active 
                          ? 'border-green-200 bg-green-50' 
                          : provider.configured 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {provider.provider === 'resend' ? (
                          <Zap className="h-4 w-4" />
                        ) : (
                          <Settings className="h-4 w-4" />
                        )}
                        <span className="font-medium capitalize">{provider.provider}</span>
                        {provider.active && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                        {provider.configured && !provider.active && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Configured
                          </span>
                        )}
                        {!provider.configured && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Not Configured
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {emailProviders.activeProvider && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Active Provider:</strong> {emailProviders.activeProvider} - All test emails and notifications will be sent using this service.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Test Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-email">Test Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to receive test messages"
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => sendTestEmail('connection')}
                  disabled={testing || !testEmail || !emailProviders?.activeProvider}
                  variant="outline"
                >
                  {testing ? 'Sending...' : 'Test Connection'}
                </Button>
                
                <Button 
                  onClick={() => sendTestEmail('weekly-report')}
                  disabled={testing || !testEmail || !emailProviders?.activeProvider}
                  variant="outline"
                >
                  {testing ? 'Sending...' : 'Test Weekly Report'}
                </Button>
              </div>
              
              {emailProviders && !emailProviders.anyConfigured && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    No email service configured. Please configure SMTP or Resend first.
                  </span>
                </div>
              )}

              {emailProviders && !emailProviders.activeProvider && emailProviders.anyConfigured && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Email service configured but no active provider selected. Please set an active provider in the SMTP or Resend tabs.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Send</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Send weekly reports to all families immediately (outside of scheduled time).
                </p>
                
                <Button 
                  onClick={sendWeeklyReports}
                  disabled={!emailProviders?.activeProvider}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Weekly Reports Now
                </Button>

                {emailProviders && !emailProviders.activeProvider && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      {emailProviders.anyConfigured 
                        ? 'No active email provider selected. Please set an active provider in the SMTP or Resend tabs.'
                        : 'No email service configured. Please configure SMTP or Resend first.'
                      }
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Notification History</CardTitle>
              <Button 
                onClick={clearHistory}
                variant="outline" 
                size="sm"
                disabled={history.length === 0}
              >
                Clear History
              </Button>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notification history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {entry.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            Family {entry.familyId} • {entry.recipients.length} recipients
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(entry.sentAt).toLocaleString()}
                            {entry.error && (
                              <span className="text-red-600 ml-2">• {entry.error}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.reportPeriod.start} - {entry.reportPeriod.end}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}