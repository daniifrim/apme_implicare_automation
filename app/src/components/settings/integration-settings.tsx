"use client";

import { useState } from "react";
import {
  Key,
  Globe,
  Trash2,
  Plus,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Webhook as WebhookIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  WEBHOOK_EVENTS,
  Webhook,
  IntegrationSettings,
  DEFAULT_SETTINGS,
} from "@/types/settings";

interface IntegrationSettingsPanelProps {
  settings?: IntegrationSettings;
  webhooks?: Webhook[];
  onSettingsChange?: (settings: IntegrationSettings) => void;
  onWebhooksChange?: (webhooks: Webhook[]) => void;
}

const INITIAL_WEBHOOKS: Webhook[] = [
  {
    id: "1",
    url: "https://example.com/webhook",
    events: ["submission.created", "assignment.completed"],
    status: "active",
    lastTriggered: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export function IntegrationSettingsPanel({
  settings = DEFAULT_SETTINGS.integration,
  webhooks = INITIAL_WEBHOOKS,
  onSettingsChange,
  onWebhooksChange,
}: IntegrationSettingsPanelProps) {
  const [localSettings, setLocalSettings] =
    useState<IntegrationSettings>(settings);
  const [localWebhooks, setLocalWebhooks] = useState<Webhook[]>(webhooks);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([
    "submission.created",
  ]);
  const [copied, setCopied] = useState(false);

  const handleSettingsChange = (updates: Partial<IntegrationSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleWebhooksChange = (newWebhooks: Webhook[]) => {
    setLocalWebhooks(newWebhooks);
    onWebhooksChange?.(newWebhooks);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(localSettings.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateApiKey = () => {
    const newKey = `sk_live_apme_${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`;
    handleSettingsChange({ apiKey: newKey });
  };

  const handleAddWebhook = () => {
    if (!newWebhookUrl || !newWebhookUrl.startsWith("http")) return;

    const newWebhook: Webhook = {
      id: Date.now().toString(),
      url: newWebhookUrl,
      events: newWebhookEvents,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    handleWebhooksChange([...localWebhooks, newWebhook]);
    setNewWebhookUrl("");
    setNewWebhookEvents(["submission.created"]);
  };

  const handleRemoveWebhook = (webhookId: string) => {
    handleWebhooksChange(localWebhooks.filter((w) => w.id !== webhookId));
  };

  const handleToggleWebhookStatus = (webhookId: string) => {
    handleWebhooksChange(
      localWebhooks.map((w) =>
        w.id === webhookId
          ? { ...w, status: w.status === "active" ? "inactive" : "active" }
          : w,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Your secret API key for external integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={localSettings.apiKey}
                  readOnly
                  className="font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button variant="outline" onClick={handleCopyApiKey}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              Keep this key secure. Do not share it in client-side code.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRegenerateApiKey}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WebhookIcon className="w-5 h-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure webhook endpoints for real-time events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-app.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <Button onClick={handleAddWebhook} disabled={!newWebhookUrl}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Events to Send</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event.value} className="flex items-center gap-2">
                  <Checkbox
                    id={event.value}
                    checked={newWebhookEvents.includes(event.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNewWebhookEvents([...newWebhookEvents, event.value]);
                      } else {
                        setNewWebhookEvents(
                          newWebhookEvents.filter((e) => e !== event.value),
                        );
                      }
                    }}
                  />
                  <Label htmlFor={event.value} className="text-sm font-normal">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Active Webhooks</Label>
            {localWebhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No webhooks configured
              </p>
            ) : (
              <div className="space-y-2">
                {localWebhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{webhook.url}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={
                            webhook.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() => handleToggleWebhookStatus(webhook.id)}
                        >
                          {webhook.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {webhook.events.length} events
                        </span>
                        {webhook.lastTriggered && (
                          <span className="text-xs text-muted-foreground">
                            Last:{" "}
                            {new Date(webhook.lastTriggered).toLocaleString()}
                          </span>
                        )}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Fillout Integration
          </CardTitle>
          <CardDescription>Configure Fillout form webhooks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filloutSecret">Webhook Secret</Label>
            <Input
              id="filloutSecret"
              type="password"
              placeholder="Enter your Fillout webhook secret"
              value={localSettings.filloutWebhookSecret || ""}
              onChange={(e) =>
                handleSettingsChange({ filloutWebhookSecret: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Used to verify webhook requests from Fillout
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
