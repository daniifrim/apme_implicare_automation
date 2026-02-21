"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityChartProps {
  data: ActivityData[];
  title?: string;
  description?: string;
  className?: string;
  loading?: boolean;
}

export function ActivityChart({
  data,
  title = "Activity",
  description,
  className,
  loading = false,
}: ActivityChartProps) {
  // Pre-defined skeleton heights for loading state (deterministic)
  const skeletonHeights = [35, 55, 42, 68, 28, 50, 45];

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          {description && <Skeleton className="h-4 w-48" />}
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end justify-between gap-2">
            {skeletonHeights.map((height, i) => (
              <Skeleton
                key={i}
                className="w-full"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  // Format date for display (e.g., "Mon", "Tue")
  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-500">last 7 days</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end justify-between gap-2">
          {data.map((day, index) => {
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            const isToday = index === data.length - 1;

            return (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all duration-500",
                      isToday ? "bg-blue-500" : "bg-blue-200 hover:bg-blue-300",
                    )}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.count} submissions on ${day.date}`}
                  />
                  {/* Tooltip-like count on hover */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs font-medium text-gray-700">
                      {day.count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDay(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
