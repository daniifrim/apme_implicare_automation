"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  SkipForward,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SendJobCounts {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
  retrying: number;
}

interface SendJob {
  id: string;
  email: string;
  templateName: string;
  status: string;
  retryCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  submissionId: string;
  submissionName: string | null;
}

interface SendsData {
  counts: SendJobCounts;
  recentJobs: SendJob[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  sending: { label: "Sending", variant: "default", icon: Loader2 },
  sent: { label: "Sent", variant: "default", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  skipped: { label: "Skipped", variant: "outline", icon: SkipForward },
  retrying: { label: "Retrying", variant: "secondary", icon: RefreshCw },
};

export default function SendsDashboardPage() {
  const [data, setData] = useState<SendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/sends");
      if (!res.ok) throw new Error("Failed to fetch send jobs");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const counts = data?.counts;

  const filteredJobs =
    statusFilter === "all"
      ? data?.recentJobs ?? []
      : data?.recentJobs.filter((j) => j.status === statusFilter) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Send Jobs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor email dispatch queue and delivery status
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2 self-start"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <StatCard
          title="Total"
          value={counts?.total ?? 0}
          icon={Mail}
          loading={loading}
        />
        <StatCard
          title="Pending"
          value={counts?.pending ?? 0}
          icon={Clock}
          variant="warning"
          loading={loading}
        />
        <StatCard
          title="Sending"
          value={counts?.sending ?? 0}
          icon={Loader2}
          variant="info"
          loading={loading}
        />
        <StatCard
          title="Sent"
          value={counts?.sent ?? 0}
          icon={CheckCircle}
          variant="success"
          loading={loading}
        />
        <StatCard
          title="Failed"
          value={counts?.failed ?? 0}
          icon={XCircle}
          variant="danger"
          loading={loading}
        />
        <StatCard
          title="Skipped"
          value={counts?.skipped ?? 0}
          icon={SkipForward}
          variant="info"
          loading={loading}
        />
        <StatCard
          title="Retrying"
          value={counts?.retrying ?? 0}
          icon={RefreshCw}
          variant="warning"
          loading={loading}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Filter by status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sending">Sending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="retrying">Retrying</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400">
          {filteredJobs.length} jobs
        </span>
      </div>

      {/* Jobs Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Retry</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No send jobs found
                </TableCell>
              </TableRow>
            )}
            {filteredJobs.map((job) => {
              const config = statusConfig[job.status] ?? statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <div className="font-medium text-sm">{job.email}</div>
                    {job.submissionName && (
                      <div className="text-xs text-gray-400">
                        {job.submissionName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {job.templateName}
                  </TableCell>
                  <TableCell className="text-sm">
                    {job.retryCount > 0 ? (
                      <span className="text-amber-600 font-medium">
                        {job.retryCount}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleString("ro-RO", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-red-600">
                    {job.lastError}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
