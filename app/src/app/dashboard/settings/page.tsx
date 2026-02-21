// ABOUTME: Settings page with organization, notifications, security, integrations, and appearance settings
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Building2, 
  Bell, 
  Shield, 
  Zap, 
  Database, 
  Plug, 
  Palette,
  Save,
  Loader2,
  Check,
  Key,
  Mail,
  Globe,
  Clock,
  Moon,
  Sun,
  Monitor,
  Copy,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Settings {
  // General
  appName: string
  timezone: string
  dateFormat: string
  language: string
  logoUrl: string | null
  
  // Notifications
  emailEnabled: boolean
  emailOnNewSubmission: boolean
  emailOnAssignmentFailure: boolean
  emailOnUserAction: boolean
  emailDigest: string
  pushEnabled: boolean
  webhookEnabled: boolean
  
  // Security
  minPasswordLength: number
  requireUppercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  twoFactorEnabled: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  
  // Automation
  autoProcessEnabled: boolean
  autoRetryEnabled: boolean
  maxRetries: number
  retryDelay: number
  processingTimeout: number
  batchSize: number
  maintenanceMode: boolean
  
  // Backup
  autoBackupEnabled: boolean
  backupFrequency: string
  backupRetentionDays: number
  includeAttachments: boolean
  lastBackupAt: string | null
  
  // Integration
  apiKey: string
  filloutWebhookSecret: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpSecure: boolean
  smtpUser: string | null
  smtpFrom: string | null
  
  // Appearance
  theme: string
  sidebarCollapsed: boolean
  denseMode: boolean
  accentColor: string
}

const TIMEZONES = [
  'Europe/Bucharest',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC'
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2024)' }
]

const LANGUAGES = [
  { value: 'ro', label: 'Română' },
  { value: 'en', label: 'English' }
]

const EMAIL_DIGESTS = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' }
]

const BACKUP_FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }
]

const ACCENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' }
]

const DEFAULT_SETTINGS: Settings = {
  appName: 'APME Implicare',
  timezone: 'Europe/Bucharest',
  dateFormat: 'DD/MM/YYYY',
  language: 'ro',
  logoUrl: null,
  emailEnabled: true,
  emailOnNewSubmission: true,
  emailOnAssignmentFailure: true,
  emailOnUserAction: false,
  emailDigest: 'daily',
  pushEnabled: false,
  webhookEnabled: true,
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  twoFactorEnabled: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  autoProcessEnabled: true,
  autoRetryEnabled: true,
  maxRetries: 3,
  retryDelay: 60,
  processingTimeout: 300,
  batchSize: 100,
  maintenanceMode: false,
  autoBackupEnabled: true,
  backupFrequency: 'daily',
  backupRetentionDays: 30,
  includeAttachments: true,
  lastBackupAt: null,
  apiKey: 'sk_live_apme_xxxxxxxxxxxxxxxx',
  filloutWebhookSecret: null,
  smtpHost: null,
  smtpPort: null,
  smtpSecure: true,
  smtpUser: null,
  smtpFrom: null,
  theme: 'system',
  sidebarCollapsed: false,
  denseMode: false,
  accentColor: 'blue'
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError('Failed to save settings')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const regenerateApiKey = () => {
    const newKey = 'sk_live_apme_' + Array.from({ length: 24 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')
    updateSetting('apiKey', newKey)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your organization settings and preferences</p>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile: Horizontal scrollable tabs */}
        <TabsList className="flex overflow-x-auto w-full sm:hidden h-auto p-1 gap-1">
          <TabsTrigger value="general" className="gap-2 flex-shrink-0">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 flex-shrink-0">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 flex-shrink-0">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2 flex-shrink-0">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Automation</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 flex-shrink-0">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 flex-shrink-0">
            <Plug className="w-4 h-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 flex-shrink-0">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Desktop: Grid layout */}
        <TabsList className="hidden sm:grid sm:grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="w-4 h-4" />
            <span>Automation</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="w-4 h-4" />
            <span>Backup</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="w-4 h-4" />
            <span>Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Configure your organization details and regional preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="appName">Organization Name</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => updateSetting('appName', e.target.value)}
                    placeholder="APME Implicare"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl || ''}
                    onChange={(e) => updateSetting('logoUrl', e.target.value || null)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Timezone
                  </Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={settings.dateFormat} 
                    onValueChange={(value) => updateSetting('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable email notifications for system events
                  </p>
                </div>
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => updateSetting('emailEnabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Email Events
                </h4>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">New submission received</Label>
                  <Switch
                    checked={settings.emailOnNewSubmission}
                    onCheckedChange={(checked) => updateSetting('emailOnNewSubmission', checked)}
                    disabled={!settings.emailEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">Assignment processing failure</Label>
                  <Switch
                    checked={settings.emailOnAssignmentFailure}
                    onCheckedChange={(checked) => updateSetting('emailOnAssignmentFailure', checked)}
                    disabled={!settings.emailEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">User actions (login, invites)</Label>
                  <Switch
                    checked={settings.emailOnUserAction}
                    onCheckedChange={(checked) => updateSetting('emailOnUserAction', checked)}
                    disabled={!settings.emailEnabled}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emailDigest">Email Digest Frequency</Label>
                  <Select 
                    value={settings.emailDigest} 
                    onValueChange={(value) => updateSetting('emailDigest', value)}
                    disabled={!settings.emailEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_DIGESTS.map(digest => (
                        <SelectItem key={digest.value} value={digest.value}>{digest.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable browser push notifications
                  </p>
                </div>
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Webhook Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send webhook events for external integrations
                  </p>
                </div>
                <Switch
                  checked={settings.webhookEnabled}
                  onCheckedChange={(checked) => updateSetting('webhookEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure password policies and security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Password Policy
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
                    <Input
                      id="minPasswordLength"
                      type="number"
                      min={6}
                      max={32}
                      value={settings.minPasswordLength}
                      onChange={(e) => updateSetting('minPasswordLength', parseInt(e.target.value) || 8)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">Require uppercase letters</Label>
                  <Switch
                    checked={settings.requireUppercase}
                    onCheckedChange={(checked) => updateSetting('requireUppercase', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">Require numbers</Label>
                  <Switch
                    checked={settings.requireNumbers}
                    onCheckedChange={(checked) => updateSetting('requireNumbers', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="flex-1">Require special characters</Label>
                  <Switch
                    checked={settings.requireSpecialChars}
                    onCheckedChange={(checked) => updateSetting('requireSpecialChars', checked)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Session & Authentication
                </h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all admin users
                    </p>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => updateSetting('twoFactorEnabled', checked)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session Timeout (minutes)
                    </Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min={5}
                      max={480}
                      value={settings.sessionTimeout}
                      onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 30)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      min={3}
                      max={10}
                      value={settings.maxLoginAttempts}
                      onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      min={5}
                      max={120}
                      value={settings.lockoutDuration}
                      onChange={(e) => updateSetting('lockoutDuration', parseInt(e.target.value) || 30)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automated processing and retry behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Process Submissions</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically process new submissions as they arrive
                  </p>
                </div>
                <Switch
                  checked={settings.autoProcessEnabled}
                  onCheckedChange={(checked) => updateSetting('autoProcessEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Retry Failed Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry failed processing attempts
                  </p>
                </div>
                <Switch
                  checked={settings.autoRetryEnabled}
                  onCheckedChange={(checked) => updateSetting('autoRetryEnabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Maximum Retry Attempts</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxRetries}
                    onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value) || 3)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    min={10}
                    max={3600}
                    value={settings.retryDelay}
                    onChange={(e) => updateSetting('retryDelay', parseInt(e.target.value) || 60)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="processingTimeout">Processing Timeout (seconds)</Label>
                  <Input
                    id="processingTimeout"
                    type="number"
                    min={60}
                    max={3600}
                    value={settings.processingTimeout}
                    onChange={(e) => updateSetting('processingTimeout', parseInt(e.target.value) || 300)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Processing Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min={10}
                    max={1000}
                    value={settings.batchSize}
                    onChange={(e) => updateSetting('batchSize', parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-amber-600">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Pause all automation and processing (admin only access)
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup Settings
              </CardTitle>
              <CardDescription>
                Configure automated backups and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable scheduled automated backups
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackupEnabled}
                  onCheckedChange={(checked) => updateSetting('autoBackupEnabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select 
                    value={settings.backupFrequency} 
                    onValueChange={(value) => updateSetting('backupFrequency', value)}
                    disabled={!settings.autoBackupEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKUP_FREQUENCIES.map(freq => (
                        <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupRetentionDays">Retention Period (days)</Label>
                  <Input
                    id="backupRetentionDays"
                    type="number"
                    min={7}
                    max={365}
                    value={settings.backupRetentionDays}
                    onChange={(e) => updateSetting('backupRetentionDays', parseInt(e.target.value) || 30)}
                    disabled={!settings.autoBackupEnabled}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Include Attachments</Label>
                  <p className="text-sm text-muted-foreground">
                    Include file attachments in backups (increases backup size)
                  </p>
                </div>
                <Switch
                  checked={settings.includeAttachments}
                  onCheckedChange={(checked) => updateSetting('includeAttachments', checked)}
                  disabled={!settings.autoBackupEnabled}
                />
              </div>
              
              {settings.lastBackupAt && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Last backup: {new Date(settings.lastBackupAt).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API & Webhook Settings
              </CardTitle>
              <CardDescription>
                Manage API keys and webhook configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type="password"
                    value={settings.apiKey}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.apiKey)}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={regenerateApiKey}
                    title="Regenerate API key"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this key to authenticate API requests
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filloutWebhookSecret">Fillout Webhook Secret</Label>
                <Input
                  id="filloutWebhookSecret"
                  type="password"
                  value={settings.filloutWebhookSecret || ''}
                  onChange={(e) => updateSetting('filloutWebhookSecret', e.target.value || null)}
                  placeholder="whsec_..."
                />
                <p className="text-sm text-muted-foreground">
                  Secret key for verifying Fillout webhook signatures
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure email server settings for outgoing notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost || ''}
                    onChange={(e) => updateSetting('smtpHost', e.target.value || null)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort || ''}
                    onChange={(e) => updateSetting('smtpPort', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="587"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="flex-1">Use Secure Connection (TLS/SSL)</Label>
                <Switch
                  checked={settings.smtpSecure}
                  onCheckedChange={(checked) => updateSetting('smtpSecure', checked)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser || ''}
                    onChange={(e) => updateSetting('smtpUser', e.target.value || null)}
                    placeholder="user@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpFrom">From Email Address</Label>
                  <Input
                    id="smtpFrom"
                    type="email"
                    value={settings.smtpFrom || ''}
                    onChange={(e) => updateSetting('smtpFrom', e.target.value || null)}
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-4">
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      settings.theme === 'light' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    <Sun className="w-6 h-6" />
                    <span className="text-sm">Light</span>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      settings.theme === 'dark' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    <Moon className="w-6 h-6" />
                    <span className="text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'system')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      settings.theme === 'system' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    <Monitor className="w-6 h-6" />
                    <span className="text-sm">System</span>
                  </button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-4">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateSetting('accentColor', color.value)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                        settings.accentColor === color.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <span className={cn('w-4 h-4 rounded-full', color.class)} />
                      <span className="text-sm">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Collapsed Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Start with collapsed sidebar on page load
                  </p>
                </div>
                <Switch
                  checked={settings.sidebarCollapsed}
                  onCheckedChange={(checked) => updateSetting('sidebarCollapsed', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dense Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing and padding throughout the UI
                  </p>
                </div>
                <Switch
                  checked={settings.denseMode}
                  onCheckedChange={(checked) => updateSetting('denseMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
