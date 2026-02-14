'use client'

import { useState } from 'react'
import { 
  Settings, 
  Users, 
  Bell, 
  Link, 
  Shield, 
  Building2,
  Save,
  X,
  Upload,
  Globe,
  Mail,
  Smartphone,
  Key,
  Lock,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface SettingsCategory {
  id: string
  label: string
  icon: React.ElementType
  description: string
}

const categories: SettingsCategory[] = [
  { id: 'general', label: 'General', icon: Building2, description: 'App name, logo, timezone' },
  { id: 'users', label: 'User Management', icon: Users, description: 'Roles, permissions, invites' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email, push, webhooks' },
  { id: 'integrations', label: 'Integrations', icon: Link, description: 'API keys, external services' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password policy, 2FA' },
]

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending'
  avatar?: string
}

interface Webhook {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  lastTriggered?: string
}

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    appName: 'APME Implicare',
    timezone: 'Europe/Bucharest',
    dateFormat: 'DD/MM/YYYY',
    language: 'ro',
  })

  // User Management State
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Jane Doe', email: 'admin@apme.ro', role: 'admin', status: 'active' },
    { id: '2', name: 'John Smith', email: 'editor@apme.ro', role: 'editor', status: 'active' },
    { id: '3', name: 'Alice Johnson', email: 'viewer@apme.ro', role: 'viewer', status: 'pending' },
  ])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    emailOnNewSubmission: true,
    emailOnAssignmentFailure: true,
    emailDigest: 'daily',
    pushEnabled: false,
    webhookEnabled: true,
  })

  // Integration Settings State
  const [apiKey, setApiKey] = useState('sk_live_apme_xxxxxxxxxxxxxxxx')
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: '1', url: 'https://example.com/webhook', events: ['submission.created', 'assignment.completed'], status: 'active', lastTriggered: '2024-01-15 10:30' },
  ])
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['submission.created'])

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    twoFactorEnabled: false,
    sessionTimeout: 30,
  })

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteUser = () => {
    if (!inviteEmail) return
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
    }
    setUsers([...users, newUser])
    setInviteEmail('')
  }

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId))
  }

  const handleAddWebhook = () => {
    if (!newWebhookUrl) return
    const newWebhook: Webhook = {
      id: Date.now().toString(),
      url: newWebhookUrl,
      events: newWebhookEvents,
      status: 'active',
    }
    setWebhooks([...webhooks, newWebhook])
    setNewWebhookUrl('')
    setNewWebhookEvents(['submission.created'])
  }

  const handleRemoveWebhook = (webhookId: string) => {
    setWebhooks(webhooks.filter(w => w.id !== webhookId))
  }

  const handleRegenerateApiKey = () => {
    setApiKey(`sk_live_apme_${Math.random().toString(36).substring(2, 18)}`)
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>Configure your application name and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={generalSettings.appName}
              onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
              placeholder="Enter application name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>Configure timezone and date formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select 
              value={generalSettings.timezone} 
              onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Bucharest">Europe/Bucharest (EET)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select 
              value={generalSettings.dateFormat} 
              onValueChange={(value) => setGeneralSettings({ ...generalSettings, dateFormat: value })}
            >
              <SelectTrigger id="dateFormat">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={generalSettings.language} 
              onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">Română</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderUserManagement = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>Invite new users to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Select value={inviteRole} onValueChange={(value: 'editor' | 'viewer') => setInviteRole(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInviteUser} disabled={!inviteEmail}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage existing users and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                  <Select 
                    value={user.role} 
                    onValueChange={(value: 'admin' | 'editor' | 'viewer') => {
                      setUsers(users.map(u => u.id === user.id ? { ...u, role: value } : u))
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveUser(user.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Overview of what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { role: 'Admin', description: 'Full access to all settings and data', permissions: ['View all data', 'Manage users', 'Configure settings', 'Delete data'] },
              { role: 'Editor', description: 'Can manage content and view data', permissions: ['View all data', 'Edit templates', 'Manage submissions', 'Cannot delete users'] },
              { role: 'Viewer', description: 'Read-only access to data', permissions: ['View submissions', 'View templates', 'Cannot edit', 'Cannot configure'] },
            ].map((item) => (
              <div key={item.role} className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">{item.role}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  {item.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Configure when and how you receive email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Checkbox 
              checked={notificationSettings.emailEnabled} 
              onCheckedChange={(checked) => 
                setNotificationSettings({ ...notificationSettings, emailEnabled: checked as boolean })
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">New Submission</Label>
              <p className="text-sm text-muted-foreground">Notify when a new form submission is received</p>
            </div>
            <Checkbox 
              checked={notificationSettings.emailOnNewSubmission} 
              onCheckedChange={(checked) => 
                setNotificationSettings({ ...notificationSettings, emailOnNewSubmission: checked as boolean })
              }
              disabled={!notificationSettings.emailEnabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Assignment Failures</Label>
              <p className="text-sm text-muted-foreground">Notify when email assignment fails</p>
            </div>
            <Checkbox 
              checked={notificationSettings.emailOnAssignmentFailure} 
              onCheckedChange={(checked) => 
                setNotificationSettings({ ...notificationSettings, emailOnAssignmentFailure: checked as boolean })
              }
              disabled={!notificationSettings.emailEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Digest Frequency</Label>
            <Select 
              value={notificationSettings.emailDigest} 
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, emailDigest: value })}
              disabled={!notificationSettings.emailEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Browser push notification settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
            </div>
            <Checkbox 
              checked={notificationSettings.pushEnabled} 
              onCheckedChange={(checked) => 
                setNotificationSettings({ ...notificationSettings, pushEnabled: checked as boolean })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderIntegrations = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key
          </CardTitle>
          <CardDescription>Your secret API key for external integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                value={apiKey} 
                readOnly 
                className="font-mono"
              />
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(apiKey)}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this key secure. Do not share it in client-side code.
            </p>
          </div>
          <Button variant="outline" onClick={handleRegenerateApiKey}>
            <Key className="w-4 h-4 mr-2" />
            Regenerate Key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Configure webhook endpoints for real-time events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="https://your-app.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleAddWebhook} disabled={!newWebhookUrl}>
              Add Webhook
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Events to Send</Label>
            <div className="flex flex-wrap gap-4">
              {['submission.created', 'submission.updated', 'assignment.completed', 'assignment.failed'].map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <Checkbox 
                    id={event}
                    checked={newWebhookEvents.includes(event)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNewWebhookEvents([...newWebhookEvents, event])
                      } else {
                        setNewWebhookEvents(newWebhookEvents.filter(e => e !== event))
                      }
                    }}
                  />
                  <Label htmlFor={event} className="text-sm font-normal">{event}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Active Webhooks</Label>
            {webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No webhooks configured</p>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{webhook.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {webhook.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Events: {webhook.events.join(', ')}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveWebhook(webhook.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password Policy
          </CardTitle>
          <CardDescription>Configure password requirements for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minLength">Minimum Password Length</Label>
            <Input
              id="minLength"
              type="number"
              min={6}
              max={32}
              value={securitySettings.minPasswordLength}
              onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Uppercase Letters</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one uppercase letter</p>
            </div>
            <Checkbox 
              checked={securitySettings.requireUppercase} 
              onCheckedChange={(checked) => 
                setSecuritySettings({ ...securitySettings, requireUppercase: checked as boolean })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Numbers</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one number</p>
            </div>
            <Checkbox 
              checked={securitySettings.requireNumbers} 
              onCheckedChange={(checked) => 
                setSecuritySettings({ ...securitySettings, requireNumbers: checked as boolean })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Special Characters</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one special character (!@#$%^&*)</p>
            </div>
            <Checkbox 
              checked={securitySettings.requireSpecialChars} 
              onCheckedChange={(checked) => 
                setSecuritySettings({ ...securitySettings, requireSpecialChars: checked as boolean })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Require 2FA for all admin users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enforce 2FA for Admins</Label>
              <p className="text-sm text-muted-foreground">All admin users must set up two-factor authentication</p>
            </div>
            <Checkbox 
              checked={securitySettings.twoFactorEnabled} 
              onCheckedChange={(checked) => 
                setSecuritySettings({ ...securitySettings, twoFactorEnabled: checked as boolean })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Settings</CardTitle>
          <CardDescription>Configure session timeout behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min={5}
              max={1440}
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Users will be automatically logged out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground font-medium capitalize">{activeCategory}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your application preferences and configurations
        </p>
      </div>

      {/* Status Messages */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-5 h-5" />
          <span>Settings saved successfully!</span>
        </div>
      )}
      
      {saveError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {categories.map((category) => {
            const Icon = category.icon
            const isActive = activeCategory === category.id
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{category.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {category.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {categories.find(c => c.id === activeCategory)?.label}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {activeCategory === 'general' && renderGeneralSettings()}
          {activeCategory === 'users' && renderUserManagement()}
          {activeCategory === 'notifications' && renderNotifications()}
          {activeCategory === 'integrations' && renderIntegrations()}
          {activeCategory === 'security' && renderSecurity()}
        </div>
      </div>
    </div>
  )
}
