"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { RecentSubmissionsList } from "@/components/dashboard/recent-submissions-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TemplatePerformanceWidget } from "@/components/dashboard/template-performance";
import { FileText, Clock, CheckCircle, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardStats {
  submissions: {
    total: number;
    pending: number;
    processed: number;
    failed: number;
    processingRate: number;
    pendingRate: number;
    trend: number;
    yesterdayCount: number;
  };
  templates: {
    total: number;
    active: number;
  };
  assignments: {
    total: number;
    pending: number;
    completed: number;
  };
}

interface TrendData {
  date: string;
  count: number;
}

interface TemplatePerformance {
  id: string;
  slug: string;
  name: string;
  _count: { assignments: number };
}

interface DashboardData {
  stats: {
    submissions: DashboardStats["submissions"];
    templates: DashboardStats["templates"];
    assignments: DashboardStats["assignments"];
  };
  trends: {
    submissions: TrendData[];
  };
  templatePerformance: TemplatePerformance[];
}

interface Submission {
  id: string;
  submissionId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  submissionTime: string;
  createdAt: string;
  locationType: string | null;
  assignmentCount: number;
  templates: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
  }>;
}

interface SubmissionsResponse {
  submissions: Submission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats and submissions in parallel
      const [statsRes, submissionsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/submissions/recent?limit=10"),
      ]);

      if (!statsRes.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      if (!submissionsRes.ok) {
        throw new Error("Failed to fetch recent submissions");
      }

      const statsData = await statsRes.json();
      const submissionsData: SubmissionsResponse = await submissionsRes.json();

      setData(statsData);
      setSubmissions(submissionsData.submissions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your email automation system
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          disabled={loading}
          className="gap-2 self-start"
        >
          <svg
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">Reload</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats?.submissions.total ?? 0}
          icon={FileText}
          trend={stats?.submissions.trend}
          trendLabel="vs yesterday"
          variant="info"
          loading={loading}
        />

        <StatCard
          title="Pending"
          value={stats?.submissions.pending ?? 0}
          icon={Clock}
          description={`${stats?.submissions.pendingRate ?? 0}% of total`}
          variant="warning"
          loading={loading}
        />

        <StatCard
          title="Processed"
          value={stats?.submissions.processed ?? 0}
          icon={CheckCircle}
          description={`${stats?.submissions.processingRate ?? 0}% completion rate`}
          variant="success"
          loading={loading}
        />

        <StatCard
          title="Active Templates"
          value={stats?.templates.active ?? 0}
          icon={Mail}
          description={`${stats?.templates.total ?? 0} total templates`}
          variant="default"
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Activity Chart - Takes 2 columns */}
        <ActivityChart
          data={data?.trends?.submissions ?? []}
          title="Submission Activity"
          description="New submissions over the last 7 days"
          className="lg:col-span-2"
          loading={loading}
        />

        {/* Quick Actions */}
        <QuickActions loading={loading} />

        {/* Recent Submissions - Takes 2 columns */}
        <RecentSubmissionsList
          submissions={submissions}
          title="Recent Submissions"
          description="Latest form submissions from missionaries"
          className="lg:col-span-2"
          loading={loading}
          viewAllHref="/dashboard/submissions"
        />

        {/* Template Performance */}
        <TemplatePerformanceWidget
          templates={data?.templatePerformance ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
}
