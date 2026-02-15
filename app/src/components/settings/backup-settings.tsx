'use client'

import { useState } from 'react'
import { Database, Download, Clock, Calendar, FileArchive, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormDirty } from '@/hooks/use-unsaved-changes'
import { BackupSettings, DEFAULT_SETTINGS } from '@/types/settings'

interface BackupSettingsPanelProps {
  settings?: BackupSettings
  onChange?: (settings: BackupSettings) => void
}

export function BackupSettingsPanel({
  settings = DEFAULT_SETTINGS.backup,
  onChange,
}: BackupSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<BackupSettings>(settings)
  const [backupInProgress, setBackupInProgress] = useState(false)

  useFormDirty('backup', settings as unknown as Record<string, unknown>, localSettings as unknown as Record<string, unknown>)

  const handleChange = (updates: Partial<BackupSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onChange?.(newSettings)
  }

  const handleManualBackup = async () => {
    setBackupInProgress(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setBackupInProgress(false)
    handleChange({ lastBackupAt: new Date().toISOString() })
  }

  const nextBackupText = () => {
    if (!localSettings.autoBackupEnabled) return 'Auto-backup disabled'
    if (!localSettings.lastBackupAt) return 'First backup pending'
    
    const lastBackup = new Date(localSettings.lastBackupAt)
    const nextBackup = new Date(lastBackup)
    
    switch (localSettings.backupFrequency) {
      case 'hourly':
        nextBackup.setHours(nextBackup.getHours() + 1)
        break
      case 'daily':
        nextBackup.setDate(nextBackup.getDate() + 1)
        break
      case 'weekly':
        nextBackup.setDate(nextBackup.getDate() + 7)
        break
    }
    
    return `Next: ${nextBackup.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Automatic Backups
            </CardTitle>
            <Badge variant={localSettings.autoBackupEnabled ? 'default' : 'secondary'}>
              {localSettings.autoBackupEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>Configure automatic data backups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Auto-Backup</Label>
              <p className="text-sm text-muted-foreground">Automatically backup your data on a schedule</p>
            </div>
            <Switch
              checked={localSettings.autoBackupEnabled}
              onCheckedChange={(checked) => handleChange({ autoBackupEnabled: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Backup Frequency</Label>
            <Select
              value={localSettings.backupFrequency}
              onValueChange={(value) => handleChange({ backupFrequency: value as typeof localSettings.backupFrequency })}
              disabled={!localSettings.autoBackupEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Every Hour
                  </div>
                </SelectItem>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Daily
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Weekly
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="retention">Retention Period (days)</Label>
              <Badge variant="secondary">{localSettings.backupRetentionDays} days</Badge>
            </div>
            <Input
              id="retention"
              type="range"
              min={7}
              max={365}
              step={7}
              value={localSettings.backupRetentionDays}
              onChange={(e) => handleChange({ backupRetentionDays: parseInt(e.target.value) })}
              disabled={!localSettings.autoBackupEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Backups older than this will be automatically deleted
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Include Attachments</Label>
              <p className="text-sm text-muted-foreground">Backup uploaded files and attachments</p>
            </div>
            <Switch
              checked={localSettings.includeAttachments}
              onCheckedChange={(checked) => handleChange({ includeAttachments: checked })}
              disabled={!localSettings.autoBackupEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            Manual Backup
          </CardTitle>
          <CardDescription>Create an on-demand backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Last Backup</p>
              <p className="text-sm text-muted-foreground">
                {localSettings.lastBackupAt 
                  ? new Date(localSettings.lastBackupAt).toLocaleString()
                  : 'No backups yet'}
              </p>
            </div>
            {localSettings.lastBackupAt && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{nextBackupText()}</p>
            <Button 
              onClick={handleManualBackup}
              disabled={backupInProgress}
            >
              <Download className="w-4 h-4 mr-2" />
              {backupInProgress ? 'Backing up...' : 'Backup Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
