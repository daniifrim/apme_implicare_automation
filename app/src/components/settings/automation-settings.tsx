"use client";

import { useState } from "react";
import { Settings2, Zap, RefreshCw, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFormDirty } from "@/hooks/use-unsaved-changes";
import { AutomationSettings, DEFAULT_SETTINGS } from "@/types/settings";

interface AutomationSettingsPanelProps {
  settings?: AutomationSettings;
  onChange?: (settings: AutomationSettings) => void;
}

export function AutomationSettingsPanel({
  settings = DEFAULT_SETTINGS.automation,
  onChange,
}: AutomationSettingsPanelProps) {
  const [localSettings, setLocalSettings] =
    useState<AutomationSettings>(settings);

  useFormDirty(
    "automation",
    settings as unknown as Record<string, unknown>,
    localSettings as unknown as Record<string, unknown>,
  );

  const handleChange = (updates: Partial<AutomationSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    onChange?.(newSettings);
  };

  return (
    <div className="space-y-6">
      <Card
        className={localSettings.maintenanceMode ? "border-yellow-500" : ""}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              System Status
            </CardTitle>
            {localSettings.maintenanceMode && (
              <Badge variant="destructive">Maintenance Mode</Badge>
            )}
          </div>
          <CardDescription>
            Control system-wide automation behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Pause all automations and show maintenance page to users
              </p>
            </div>
            <Switch
              checked={localSettings.maintenanceMode}
              onCheckedChange={(checked) =>
                handleChange({ maintenanceMode: checked })
              }
            />
          </div>

          {localSettings.maintenanceMode && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">
                    Warning: Maintenance Mode Active
                  </p>
                  <p>
                    All automations are paused. New submissions will be queued
                    but not processed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Auto-Processing
          </CardTitle>
          <CardDescription>
            Configure automatic submission processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Auto-Processing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically process new submissions as they arrive
              </p>
            </div>
            <Switch
              checked={localSettings.autoProcessEnabled}
              onCheckedChange={(checked) =>
                handleChange({ autoProcessEnabled: checked })
              }
              disabled={localSettings.maintenanceMode}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="batchSize">Processing Batch Size</Label>
              <Badge variant="secondary">
                {localSettings.batchSize} submissions
              </Badge>
            </div>
            <Input
              id="batchSize"
              type="range"
              min={10}
              max={500}
              step={10}
              value={localSettings.batchSize}
              onChange={(e) =>
                handleChange({ batchSize: parseInt(e.target.value) })
              }
              disabled={!localSettings.autoProcessEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Number of submissions to process in each batch
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="processingTimeout">
                Processing Timeout (seconds)
              </Label>
              <Badge variant="secondary">
                {localSettings.processingTimeout}s
              </Badge>
            </div>
            <Input
              id="processingTimeout"
              type="range"
              min={60}
              max={600}
              step={30}
              value={localSettings.processingTimeout}
              onChange={(e) =>
                handleChange({ processingTimeout: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum time allowed for processing a single submission
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Retry Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic retry behavior for failed operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Auto-Retry</Label>
              <p className="text-sm text-muted-foreground">
                Automatically retry failed operations
              </p>
            </div>
            <Switch
              checked={localSettings.autoRetryEnabled}
              onCheckedChange={(checked) =>
                handleChange({ autoRetryEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxRetries">Maximum Retries</Label>
              <Badge variant="secondary">
                {localSettings.maxRetries} attempts
              </Badge>
            </div>
            <Input
              id="maxRetries"
              type="range"
              min={1}
              max={10}
              value={localSettings.maxRetries}
              onChange={(e) =>
                handleChange({ maxRetries: parseInt(e.target.value) })
              }
              disabled={!localSettings.autoRetryEnabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
              <Badge variant="secondary">{localSettings.retryDelay}s</Badge>
            </div>
            <Input
              id="retryDelay"
              type="range"
              min={10}
              max={300}
              step={10}
              value={localSettings.retryDelay}
              onChange={(e) =>
                handleChange({ retryDelay: parseInt(e.target.value) })
              }
              disabled={!localSettings.autoRetryEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Wait time between retry attempts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
