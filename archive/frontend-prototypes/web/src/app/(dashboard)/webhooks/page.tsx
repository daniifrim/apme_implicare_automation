"use client";

import { Webhook, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const webhookEvents = [
  {
    id: "evt_9k2_accepted",
    status: "accepted",
    endpoint: "/api/v1/ingest",
    latency: 145,
    timestamp: "2025-05-28T14:22:01",
    payload: { submissionId: "fi7bawve...", formId: "frm_123" },
  },
  {
    id: "evt_9k1_accepted",
    status: "accepted",
    endpoint: "/api/v1/ingest",
    latency: 110,
    timestamp: "2025-05-28T14:20:55",
    payload: { submissionId: "4xavmw4q...", formId: "frm_123" },
  },
  {
    id: "evt_9k0_rejected",
    status: "rejected",
    endpoint: "/api/v1/ingest",
    latency: 82,
    timestamp: "2025-05-28T14:18:30",
    error: "Invalid signature verification",
    payload: null,
  },
  {
    id: "evt_9jz_accepted",
    status: "accepted",
    endpoint: "/api/v1/ingest",
    latency: 156,
    timestamp: "2025-05-28T14:15:22",
    payload: { submissionId: "dxteud8w...", formId: "frm_123" },
  },
  {
    id: "evt_9jy_pending",
    status: "pending",
    endpoint: "/api/v1/ingest",
    latency: null,
    timestamp: "2025-05-28T14:12:10",
    payload: { submissionId: "kaa6w5su...", formId: "frm_123" },
  },
];

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  accepted: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
};

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Webhook Events</h2>
          <p className="text-sm text-muted-foreground">Monitor incoming webhook events from Fillout</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Listening
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Events (24h)
          </div>
          <div className="text-2xl font-bold mt-1">1,247</div>
        </div>
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Success Rate
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">98.4%</div>
        </div>
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg Latency
          </div>
          <div className="text-2xl font-bold mt-1">124ms</div>
        </div>
      </div>

      <div className="bg-card border rounded-custom overflow-hidden">
        <div className="divide-y">
          {webhookEvents.map((event) => {
            const StatusIcon = statusConfig[event.status].icon;
            return (
              <div
                key={event.id}
                className="p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
              >
                <div
                  className={`w-10 h-10 ${statusConfig[event.status].bg} ${statusConfig[event.status].color} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <StatusIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold">{event.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.latency ? `${event.latency}ms` : "—"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.status === "rejected" ? (
                      <span className="text-red-600">{event.error}</span>
                    ) : (
                      <>
                        {event.status === "accepted" ? "Delivery payload accepted" : "Processing..."} via{" "}
                        <code className="text-xs bg-muted px-1 rounded">{event.endpoint}</code>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>

                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
