"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Send, Settings, Zap } from "lucide-react"

interface ResendConfig {
  apiKey: string;
  from: string;
}

interface ResendStatus {
  configured: boolean;
  config?: {
    from: string;
    apiKey: string | null;
  };
}

interface EmailProvider {
  provider: 'smtp' | 'resend';
  configured: boolean;
  active: boolean;
}

interface ProvidersStatus {
  providers: EmailProvider[];
  activeProvider: 'smtp' | 'resend' | null;
  anyConfigured: boolean;
}

export function ResendConfig() {
  const [config, setConfig] = useState<ResendConfig>({
    apiKey: '',
    from: 'onboarding@resend.dev'
  })
  const [status, setStatus] = useState<ResendStatus | null>(null)
  const [providers, setProviders] = useState<ProvidersStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchResendStatus()
    fetchProviders()
  }, [])

  const fetchResendStatus = async () => {
    try {
      const response = await fetch('/api/admin/email/resend')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.config) {
          setConfig({
            apiKey: '', // Don't populate masked API key
            from: data.config.from
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch Resend status:', error)
    }
  }

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/email/providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/email/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Resend configuration saved successfully' })
        await fetchResendStatus()
        await fetchProviders()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/email/resend', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test-connection' }),
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Connection test successful' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Connection test failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setTesting(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) return
    
    setTesting(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/email/resend', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test-email', email: testEmail }),
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: 'success', text: `Test email sent successfully to ${testEmail}` })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setTesting(false)
    }
  }

  const setAsActiveProvider = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/email/resend', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'set-active' }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Resend set as active email provider' })
        await fetchProviders()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to set active provider' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const isResendActive = providers?.activeProvider === 'resend'
  const isConfigured = status?.configured || false

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Resend Email Service</h2>
          {isResendActive && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              Active
            </Badge>
          )}
          {isConfigured && !isResendActive && (
            <Badge variant="secondary">
              Configured
            </Badge>
          )}
        </div>
        <p className="text-gray-600 text-sm">
          Configure Resend for reliable email delivery. Resend is a developer-friendly email service with excellent deliverability.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </CardTitle>
            <CardDescription>
              Set up your Resend API key and sender email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Get your API key from the{' '}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Resend dashboard
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">From Email</Label>
              <Input
                id="from"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={config.from}
                onChange={(e) => setConfig({ ...config, from: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Must be from a verified domain. Use 'onboarding@resend.dev' for testing.
              </p>
            </div>

            <Button 
              onClick={saveConfig} 
              disabled={loading || !config.apiKey || !config.from}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* Testing and Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Testing
            </CardTitle>
            <CardDescription>
              Test your Resend configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
              {isConfigured ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Configuration valid</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">Not configured</span>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing || !isConfigured}
                className="w-full"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={sendTestEmail}
                  disabled={testing || !testEmail || !isConfigured}
                >
                  Send Test
                </Button>
              </div>

              {isConfigured && !isResendActive && (
                <Button
                  onClick={setAsActiveProvider}
                  disabled={loading}
                  className="w-full"
                >
                  Set as Active Provider
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup Guide</CardTitle>
          <CardDescription>
            Follow these steps to set up Resend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Create a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a></li>
            <li>Verify your domain (or use 'onboarding@resend.dev' for testing)</li>
            <li>Generate an API key in your dashboard</li>
            <li>Enter your API key and sender email above</li>
            <li>Test the configuration</li>
            <li>Set as active provider</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}