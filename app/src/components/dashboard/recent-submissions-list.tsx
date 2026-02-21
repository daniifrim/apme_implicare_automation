"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, User, Mail, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface Submission {
  id: string;
  submissionId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  submissionTime: Date | string;
  createdAt: Date | string;
  locationType: string | null;
  assignmentCount: number;
  templates: TemplateInfo[];
}

interface RecentSubmissionsListProps {
  submissions: Submission[];
  title?: string;
  description?: string;
  className?: string;
  loading?: boolean;
  viewAllHref?: string;
}

const statusConfig = {
  pending: { label: "Pending", variant: "default" as const, icon: Clock },
  processed: {
    label: "Processed",
    variant: "secondary" as const,
    icon: CheckCircle,
  },
  failed: { label: "Failed", variant: "destructive" as const, icon: Clock },
  default: { label: "Unknown", variant: "outline" as const, icon: Clock },
};

export function RecentSubmissionsList({
  submissions,
  title = "Recent Submissions",
  description,
  className,
  loading = false,
  viewAllHref = "/dashboard/submissions",
}: RecentSubmissionsListProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          {description && <Skeleton className="h-4 w-56" />}
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "??";
  };

  const getStatusConfig = (status: string) => {
    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.default
    );
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {viewAllHref && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={viewAllHref} className="gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Mail className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No submissions yet
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Submissions will appear here when forms are submitted
            </p>
          </div>
        ) : (
          submissions.map((submission) => {
            const status = getStatusConfig(submission.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={submission.id}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-gray-50/50 -mx-6 px-6"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium text-sm">
                  {getInitials(submission.firstName, submission.lastName)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {submission.firstName} {submission.lastName}
                    </p>
                    {submission.assignmentCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {submission.assignmentCount} template
                        {submission.assignmentCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="truncate">{submission.email}</span>
                    <span>•</span>
                    <span>{formatDate(submission.submissionTime)}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant} className="gap-1 text-xs">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link href={`/dashboard/submissions/${submission.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
