'use client'

import { useState } from 'react'
import { Palette, Moon, Sun, Monitor, Minimize2, Maximize2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useFormDirty } from '@/hooks/use-unsaved-changes'
import { AppearanceSettings, DEFAULT_SETTINGS } from '@/types/settings'
import { cn } from '@/lib/utils'

interface AppearanceSettingsPanelProps {
  settings?: AppearanceSettings
  onChange?: (settings: AppearanceSettings) => void
}

const ACCENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500', color: '#3b82f6' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500', color: '#a855f7' },
  { value: 'green', label: 'Green', class: 'bg-green-500', color: '#22c55e' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500', color: '#f97316' },
] as const

export function AppearanceSettingsPanel({
  settings = DEFAULT_SETTINGS.appearance,
  onChange,
}: AppearanceSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<AppearanceSettings>(settings)

  useFormDirty('appearance', settings as unknown as Record<string, unknown>, localSettings as unknown as Record<string, unknown>)

  const handleChange = (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onChange?.(newSettings)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme
          </CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={localSettings.theme}
            onValueChange={(value) => handleChange({ theme: value as typeof localSettings.theme })}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem
                value="light"
                id="theme-light"
                className="peer sr-only"
              />
              <Label
                htmlFor="theme-light"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary",
                  localSettings.theme === 'light' && "border-primary bg-accent"
                )}
              >
                <Sun className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Light</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="dark"
                id="theme-dark"
                className="peer sr-only"
              />
              <Label
                htmlFor="theme-dark"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary",
                  localSettings.theme === 'dark' && "border-primary bg-accent"
                )}
              >
                <Moon className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Dark</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="system"
                id="theme-system"
                className="peer sr-only"
              />
              <Label
                htmlFor="theme-system"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary",
                  localSettings.theme === 'system' && "border-primary bg-accent"
                )}
              >
                <Monitor className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">System</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Accent Color
          </CardTitle>
          <CardDescription>Choose your preferred accent color</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={localSettings.accentColor}
            onValueChange={(value) => handleChange({ accentColor: value as typeof localSettings.accentColor })}
            className="grid grid-cols-4 gap-4"
          >
            {ACCENT_COLORS.map((color) => (
              <div key={color.value}>
                <RadioGroupItem
                  value={color.value}
                  id={`color-${color.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`color-${color.value}`}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-md border-2 border-muted p-4 hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary",
                    localSettings.accentColor === color.value && "border-primary bg-accent"
                  )}
                >
                  <div 
                    className={cn("w-8 h-8 rounded-full", color.class)}
                  />
                  <span className="text-sm font-medium">{color.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5" />
            Layout
          </CardTitle>
          <CardDescription>Customize the interface layout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Dense Mode</Label>
              <p className="text-sm text-muted-foreground">Reduce spacing for more compact views</p>
            </div>
            <Switch
              checked={localSettings.denseMode}
              onCheckedChange={(checked) => handleChange({ denseMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Collapsed Sidebar</Label>
              <p className="text-sm text-muted-foreground">Start with sidebar in collapsed state</p>
            </div>
            <Switch
              checked={localSettings.sidebarCollapsed}
              onCheckedChange={(checked) => handleChange({ sidebarCollapsed: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
