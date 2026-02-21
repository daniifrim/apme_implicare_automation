"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  Mail,
  FileText,
  Settings,
  RefreshCw,
  LucideIcon,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "outline" | "ghost";
}

interface QuickActionsProps {
  actions?: QuickAction[];
  title?: string;
  className?: string;
  loading?: boolean;
}

const defaultActions: QuickAction[] = [
  {
    label: "New Template",
    href: "/dashboard/templates",
    icon: Plus,
    description: "Create email template",
    variant: "default",
  },
  {
    label: "View Submissions",
    href: "/dashboard/submissions",
    icon: FileText,
    description: "Check recent submissions",
    variant: "outline",
  },
  {
    label: "Manage Templates",
    href: "/dashboard/templates",
    icon: Mail,
    description: "Edit existing templates",
    variant: "outline",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Configure system",
    variant: "outline",
  },
];

export function QuickActions({
  actions = defaultActions,
  title = "Quick Actions",
  className,
  loading = false,
}: QuickActionsProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto justify-start gap-3 px-3 py-3 text-left"
              asChild
            >
              <Link href={action.href}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  {action.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {action.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
