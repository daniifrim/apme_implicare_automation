'use client'

import { useState } from 'react'
import { Bell, Mail, Smartphone, Webhook, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useFormDirty } from '@/hooks/use-unsaved-changes'
import { NotificationSettings, DEFAULT_SETTINGS } from '@/types/settings'

interface NotificationSettingsPanelProps {
  settings?: NotificationSettings
  onChange?: (settings: NotificationSettings) => void
}

export function NotificationSettingsPanel({
  settings = DEFAULT_SETTINGS.notifications,
  onChange,
}: NotificationSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings)

  useFormDirty('notifications', settings, localSettings)

  const handleChange = (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onChange?.(newSettings)
  }

  return (
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
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              checked={localSettings.emailEnabled}
              onCheckedChange={(checked) => handleChange({ emailEnabled: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">New Submission</Label>
              <p className="text-sm text-muted-foreground">Notify when a new form submission is received</p>
            </div>
            <Switch
              checked={localSettings.emailOnNewSubmission}
              onCheckedChange={(checked) => handleChange({ emailOnNewSubmission: checked })}
              disabled={!localSettings.emailEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Assignment Failures</Label>
              <p className="text-sm text-muted-foreground">Notify when email assignment fails</p>
            </div>
            <Switch
              checked={localSettings.emailOnAssignmentFailure}
              onCheckedChange={(checked) => handleChange({ emailOnAssignmentFailure: checked })}
              disabled={!localSettings.emailEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">User Actions</Label>
              <p className="text-sm text-muted-foreground">Notify on user invites, logins, and role changes</p>
            </div>
            <Switch
              checked={localSettings.emailOnUserAction}
              onCheckedChange={(checked) => handleChange({ emailOnUserAction: checked })}
              disabled={!localSettings.emailEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Digest Frequency</Label>
            <Select
              value={localSettings.emailDigest}
              onValueChange={(value) => handleChange({ emailDigest: value as typeof localSettings.emailDigest })}
              disabled={!localSettings.emailEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly Digest</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
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
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
            </div>
            <Switch
              checked={localSettings.pushEnabled}
              onCheckedChange={(checked) => handleChange({ pushEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhook Notifications
          </CardTitle>
          <CardDescription>Send notifications to external webhook endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Webhook Notifications</Label>
              <p className="text-sm text-muted-foreground">Forward events to configured webhook URLs</p>
            </div>
            <Switch
              checked={localSettings.webhookEnabled}
              onCheckedChange={(checked) => handleChange({ webhookEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            Notification Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            Free tier: Up to 100 emails/day. Upgrade to Pro for unlimited notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
