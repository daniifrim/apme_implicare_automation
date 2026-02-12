"use client";

import { useState } from "react";
import { RefreshCw, Settings2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockSubmissions, Submission } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusConfig = {
  accepted: { color: "bg-green-500", text: "text-green-700", bg: "bg-green-100", label: "Accepted" },
  pending: { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100", label: "Pending" },
  error: { color: "bg-red-500", text: "text-red-700", bg: "bg-red-100", label: "Error" },
};

export default function SubmissionsPage() {
  const [filter, setFilter] = useState("ALL");
  const [timeWindow, setTimeWindow] = useState("60min");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubmissions = mockSubmissions.filter((submission) => {
    if (filter !== "ALL" && submission.status !== filter.toLowerCase()) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        submission.name.toLowerCase().includes(query) ||
        submission.email.toLowerCase().includes(query) ||
        submission.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Submissions Console</h2>
          <p className="text-sm text-muted-foreground">Real-time ingestion monitor & operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Live Stream Active
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-card border rounded-custom overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b flex items-center gap-6 bg-muted/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Window</span>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="text-[11px] font-bold bg-transparent border-none focus:ring-0 p-0 cursor-pointer text-primary"
            >
              <option value="60min">Last 60 Minutes</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="h-4 w-[1px] bg-border"></div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Status</span>
            <div className="flex gap-1.5">
              {["ALL", "ERRORS", "PENDING"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors",
                    filter === status
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3 h-3" />
              <Input
                type="text"
                placeholder="Filter by ID or Source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 h-7 text-[11px] w-56"
              />
            </div>
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2.5 border-r last:border-r-0">Submission ID</th>
                <th className="px-4 py-2.5 border-r last:border-r-0">Status</th>
                <th className="px-4 py-2.5 border-r last:border-r-0">Name</th>
                <th className="px-4 py-2.5 border-r last:border-r-0">Location</th>
                <th className="px-4 py-2.5 border-r last:border-r-0">Assigned Templates</th>
                <th className="px-4 py-2.5 border-r last:border-r-0">Age</th>
                <th className="px-4 py-2.5 text-right">Submitted</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y">
              {filteredSubmissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="hover:bg-accent/40 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-2 border-r last:border-r-0 font-mono text-[11px] text-primary font-bold">
                    {submission.id.slice(0, 20)}...
                  </td>
                  <td className="px-4 py-2 border-r last:border-r-0">
                    <span
                      className={cn(
                        "flex items-center gap-1.5 font-bold uppercase tracking-tighter",
                        statusConfig[submission.status].text
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shadow-sm",
                          statusConfig[submission.status].color,
                          submission.status === "pending" && "animate-pulse"
                        )}
                      />
                      {statusConfig[submission.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r last:border-r-0 font-medium">
                    {submission.name}
                  </td>
                  <td className="px-4 py-2 border-r last:border-r-0 text-muted-foreground">
                    {submission.location === "În România"
                      ? submission.cityRomania
                      : submission.cityCountry}
                  </td>
                  <td className="px-4 py-2 border-r last:border-r-0">
                    <div className="flex flex-wrap gap-1">
                      {submission.assignedTemplates.map((template) => (
                        <Badge
                          key={template}
                          variant="outline"
                          className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-primary/5 text-primary border-primary/20"
                        >
                          {template}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r last:border-r-0 font-mono text-[10px] text-muted-foreground">
                    {submission.age}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground tabular-nums font-medium">
                    {new Date(submission.submissionTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Statistics */}
        <div className="px-4 py-2 border-t flex items-center justify-between bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span>Total: {filteredSubmissions.length}</span>
            <span className="text-green-600">Accepted: {filteredSubmissions.filter((s) => s.status === "accepted").length}</span>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[10px]">
              <ChevronLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]">
              Next
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
