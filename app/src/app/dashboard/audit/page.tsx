"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditUser {
  id: string;
  name: string | null;
  email: string;
}

interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  user: AuditUser;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Filters {
  actions: string[];
  resources: string[];
  users: AuditUser[];
}

interface AuditResponse {
  events: AuditEvent[];
  pagination: Pagination;
  filters: Filters;
}

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: "bg-green-100 text-green-800",
    updated: "bg-blue-100 text-blue-800",
    deleted: "bg-red-100 text-red-800",
    published: "bg-purple-100 text-purple-800",
    backfilled: "bg-orange-100 text-orange-800",
    "changed mapping": "bg-yellow-100 text-yellow-800",
  };
  return colors[action] || "bg-gray-100 text-gray-800";
};

const getResourceIcon = (resource: string): string => {
  const icons: Record<string, string> = {
    template: "📄",
    mapping: "🔗",
    submission: "📝",
    user: "👤",
    setting: "⚙️",
  };
  return icons[resource] || "📋";
};

const getInitials = (name: string | null, email: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDefaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
};

export default function AuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [availableFilters, setAvailableFilters] = useState<Filters>({
    actions: [],
    resources: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const defaultDates = getDefaultDateRange();

  const [filters, setFilters] = useState({
    action: searchParams.get("action") || "",
    resource: searchParams.get("resource") || "",
    userId: searchParams.get("userId") || "",
    search: searchParams.get("search") || "",
    from: searchParams.get("from") || defaultDates.from,
    to: searchParams.get("to") || defaultDates.to,
    page: parseInt(searchParams.get("page") || "1"),
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set("action", filters.action);
      if (filters.resource) params.set("resource", filters.resource);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.search) params.set("search", filters.search);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      params.set("page", String(filters.page));
      params.set("limit", "50");

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data: AuditResponse = await response.json();
      setEvents(data.events);
      setPagination(data.pagination);
      setAvailableFilters(data.filters);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.resource) params.set("resource", filters.resource);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.search) params.set("search", filters.search);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.page > 1) params.set("page", String(filters.page));

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/audit${newUrl}`, { scroll: false });
  }, [filters, router]);

  const handleFilterChange = (key: string, value: string) => {
    // Convert "__all__" back to empty string for "All" filter option
    const actualValue = value === "__all__" ? "" : value;
    setFilters((prev) => ({ ...prev, [key]: actualValue, page: 1 }));
  };

  const clearFilters = () => {
    const defaultDates = getDefaultDateRange();
    setFilters({
      action: "",
      resource: "",
      userId: "",
      search: "",
      from: defaultDates.from,
      to: defaultDates.to,
      page: 1,
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.action || filters.resource || filters.userId || filters.search
    );
  };

  const renderDiff = (oldValue: unknown, newValue: unknown) => {
    if (!oldValue && !newValue)
      return <p className="text-muted-foreground">No changes recorded</p>;

    return (
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-600">Before</p>
          <pre className="text-xs bg-red-50 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(oldValue, null, 2)}
          </pre>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-600">After</p>
          <pre className="text-xs bg-green-50 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(newValue, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">
            Track all changes to templates, mappings, and settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date(filters.from).toLocaleDateString()} -{" "}
            {new Date(filters.to).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by resource or user..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={filters.action || "__all__"}
          onValueChange={(v) => handleFilterChange("action", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Actions</SelectItem>
            {availableFilters.actions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.resource || "__all__"}
          onValueChange={(v) => handleFilterChange("resource", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Resources</SelectItem>
            {availableFilters.resources.map((resource) => (
              <SelectItem key={resource} value={resource}>
                {resource}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.userId || "__all__"}
          onValueChange={(v) => handleFilterChange("userId", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Users</SelectItem>
            {availableFilters.users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters() && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-custom overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No audit events found</p>
            {hasActiveFilters() && (
              <Button variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 flex gap-4 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-muted text-xs font-bold">
                    {getInitials(event.user.name, event.user.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="text-sm mb-1">
                    <span className="font-bold">
                      {event.user.name || event.user.email}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {event.action}
                    </span>{" "}
                    <span className="font-mono text-primary">
                      {event.resourceId || event.resource}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.newValue &&
                    typeof event.newValue === "object" &&
                    "name" in event.newValue
                      ? String(event.newValue.name)
                      : `${event.resource} ${event.action}`}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <span>{formatDate(event.createdAt)}</span>
                    <span>•</span>
                    <button className="text-primary hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[9px] flex-shrink-0 ${getActionColor(event.action)}`}
                >
                  {getResourceIcon(event.resource)} {event.resource}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFilterChange("page", String(filters.page - 1))
              }
              disabled={filters.page <= 1}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="sm:hidden">Prev</span>
            </Button>
            <span className="text-sm px-4">
              {filters.page} / {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFilterChange("page", String(filters.page + 1))
              }
              disabled={filters.page >= pagination.pages}
              className="flex-1 sm:flex-none"
            >
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {selectedEvent &&
                    getInitials(
                      selectedEvent.user.name,
                      selectedEvent.user.email,
                    )}
                </AvatarFallback>
              </Avatar>
              <span>Audit Event Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">
                    {selectedEvent.user.name || selectedEvent.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {new Date(selectedEvent.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <Badge className={getActionColor(selectedEvent.action)}>
                    {selectedEvent.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Resource</p>
                  <p className="font-medium">
                    {getResourceIcon(selectedEvent.resource)}{" "}
                    {selectedEvent.resource}
                  </p>
                </div>
                {selectedEvent.resourceId && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Resource ID</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedEvent.resourceId}
                    </code>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Change Details</h4>
                {renderDiff(selectedEvent.oldValue, selectedEvent.newValue)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
