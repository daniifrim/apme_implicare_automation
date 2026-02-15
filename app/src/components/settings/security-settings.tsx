'use client'

import { useState } from 'react'
import { Shield, Lock, Clock, Eye, EyeOff, Key, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFormDirty } from '@/hooks/use-unsaved-changes'
import { SecuritySettings, DEFAULT_SETTINGS } from '@/types/settings'

interface SecuritySettingsPanelProps {
  settings?: SecuritySettings
  onChange?: (settings: SecuritySettings) => void
}

export function SecuritySettingsPanel({
  settings = DEFAULT_SETTINGS.security,
  onChange,
}: SecuritySettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<SecuritySettings>(settings)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  useFormDirty('security', settings, localSettings)

  const handleChange = (updates: Partial<SecuritySettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onChange?.(newSettings)
  }

  const passwordStrength = () => {
    let score = 0
    if (localSettings.minPasswordLength >= 8) score++
    if (localSettings.minPasswordLength >= 12) score++
    if (localSettings.requireUppercase) score++
    if (localSettings.requireNumbers) score++
    if (localSettings.requireSpecialChars) score++
    return score
  }

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-emerald-600']

  return (
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
            <div className="flex items-center justify-between">
              <Label htmlFor="minLength">Minimum Password Length</Label>
              <Badge variant={passwordStrength() >= 3 ? 'default' : 'secondary'}>
                {localSettings.minPasswordLength} characters
              </Badge>
            </div>
            <Input
              id="minLength"
              type="range"
              min={6}
              max={32}
              value={localSettings.minPasswordLength}
              onChange={(e) => handleChange({ minPasswordLength: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>6</span>
              <span>32</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Require Uppercase Letters</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one uppercase letter</p>
            </div>
            <Switch
              checked={localSettings.requireUppercase}
              onCheckedChange={(checked) => handleChange({ requireUppercase: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Require Numbers</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one number</p>
            </div>
            <Switch
              checked={localSettings.requireNumbers}
              onCheckedChange={(checked) => handleChange({ requireNumbers: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Require Special Characters</Label>
              <p className="text-sm text-muted-foreground">Password must contain at least one special character (!@#$%^*&amp;*)</p>
            </div>
            <Switch
              checked={localSettings.requireSpecialChars}
              onCheckedChange={(checked) => handleChange({ requireSpecialChars: checked })}
            />
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Policy Strength</span>
              <Badge className={strengthColors[passwordStrength()]}>
                {strengthLabels[passwordStrength()]}
              </Badge>
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${strengthColors[passwordStrength()]}`}
                style={{ width: `${(passwordStrength() / 5) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Require 2FA for admin users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enforce 2FA for Admins</Label>
              <p className="text-sm text-muted-foreground">All admin users must set up two-factor authentication</p>
            </div>
            <Switch
              checked={localSettings.twoFactorEnabled}
              onCheckedChange={(checked) => handleChange({ twoFactorEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Settings
          </CardTitle>
          <CardDescription>Configure session timeout and login security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Badge variant="secondary">{localSettings.sessionTimeout} min</Badge>
            </div>
            <Input
              id="sessionTimeout"
              type="range"
              min={5}
              max={240}
              step={5}
              value={localSettings.sessionTimeout}
              onChange={(e) => handleChange({ sessionTimeout: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Users will be automatically logged out after this period of inactivity
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Badge variant="secondary">{localSettings.maxLoginAttempts} attempts</Badge>
            </div>
            <Input
              id="maxLoginAttempts"
              type="range"
              min={3}
              max={10}
              value={localSettings.maxLoginAttempts}
              onChange={(e) => handleChange({ maxLoginAttempts: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Number of failed login attempts before account lockout
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Badge variant="secondary">{localSettings.lockoutDuration} min</Badge>
            </div>
            <Input
              id="lockoutDuration"
              type="range"
              min={5}
              max={120}
              step={5}
              value={localSettings.lockoutDuration}
              onChange={(e) => handleChange({ lockoutDuration: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              How long to lock an account after max failed attempts
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Security Audit
          </CardTitle>
          <CardDescription>Review security-related events</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <History className="w-4 h-4 mr-2" />
            View Security Audit Log
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
