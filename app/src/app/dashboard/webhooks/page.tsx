"use client";

// ABOUTME: Renders the webhooks monitoring dashboard with real event data
// ABOUTME: Fetches from /api/webhooks/events with filtering and pagination
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WebhookEvent {
  id: string;
  eventId: string;
  eventType: string;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface Metrics {
  total: number;
  successRate: number;
  avgLatency: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  completed: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Accepted",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Rejected",
  },
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Pending",
  },
  processing: {
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Processing",
  },
};

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    successRate: 0,
    avgLatency: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/webhooks/events?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch webhook events");
      }

      const data = await response.json();
      setEvents(data.events);
      setMetrics(data.metrics);
      setPagination(data.pagination);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    fetchEvents();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Webhook Events</h2>
          <p className="text-sm text-muted-foreground">
            Monitor incoming webhook events from Fillout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Listening
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Events
          </div>
          <div className="text-2xl font-bold mt-1">
            {metrics.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Success Rate
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${metrics.successRate >= 95 ? "text-green-600" : metrics.successRate >= 80 ? "text-amber-600" : "text-red-600"}`}
          >
            {metrics.successRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg Latency
          </div>
          <div className="text-2xl font-bold mt-1">
            {formatLatency(metrics.avgLatency)}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-custom p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Error loading events
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-card border rounded-custom overflow-hidden">
        <div className="divide-y">
          {loading && events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No webhook events found
            </div>
          ) : (
            events.map((event) => {
              const config = statusConfig[event.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const latency =
                event.processedAt && event.createdAt
                  ? new Date(event.processedAt).getTime() -
                    new Date(event.createdAt).getTime()
                  : null;

              return (
                <div
                  key={event.id}
                  className="p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
                >
                  <div
                    className={`w-10 h-10 ${config.bg} ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold">
                        {event.eventId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {latency ? formatLatency(latency) : "—"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {event.status === "failed" ? (
                        <span className="text-red-600">
                          {event.errorMessage || "Processing failed"}
                        </span>
                      ) : (
                        <>
                          {config.label} via{" "}
                          <code className="text-xs bg-muted px-1 rounded">
                            {event.eventType}
                          </code>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </div>

                  <Button variant="ghost" size="sm">
                    Details
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1 || loading}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages || loading}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
