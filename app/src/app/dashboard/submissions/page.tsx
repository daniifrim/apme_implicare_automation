// ABOUTME: Renders the submissions list with filters, bulk actions, and detail modal
// ABOUTME: Handles fetching submissions data and presenting read-only submission details
// ABOUTME: Supports draggable column reordering with persistence
"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Download,
  RotateCw,
  X,
  MapPin,
  CheckSquare,
  Square,
  FileText,
  Mail,
  Phone,
  Building2,
  MapPinned,
  SlidersHorizontal,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Submission {
  id: string;
  submissionId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  locationType: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  church: string | null;
  status: string;
  submissionTime: string;
  assignments: Array<{
    id: string;
    template: { name: string };
    status: string;
  }>;
}

interface SubmissionDetail {
  id: string;
  submissionId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locationType: string | null;
  city: string | null;
  country: string | null;
  church: string | null;
  status: string;
  submissionTime: string;
  assignments: Array<{
    id: string;
    template: { name: string };
    status: string;
  }>;
  answers: Array<{
    id: string;
    value: string | null;
    rawValue: unknown;
    question: { id: string; name: string };
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ColumnDef {
  id: string;
  label: string;
  locked: boolean;
  width?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "checkbox", label: "", locked: true, width: "48px" },
  { id: "person", label: "Person", locked: true, width: "200px" },
  { id: "submissionId", label: "Submission ID", locked: false, width: "160px" },
  { id: "date", label: "Date", locked: false, width: "120px" },
  { id: "status", label: "Status", locked: false, width: "100px" },
  { id: "location", label: "Location", locked: false, width: "150px" },
  { id: "country", label: "Country", locked: false, width: "120px" },
  { id: "phone", label: "Phone", locked: false, width: "140px" },
  { id: "church", label: "Church", locked: false, width: "160px" },
  { id: "templates", label: "Templates", locked: false, width: "200px" },
];

const STORAGE_KEY = "submissions-table-columns";

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        status === "processed" && "bg-green-100 text-green-800",
        status === "pending" && "bg-yellow-100 text-yellow-800",
        status === "failed" && "bg-red-100 text-red-800",
      )}
    >
      {status}
    </span>
  );
}

function SortableHeader({
  column,
  children,
}: {
  column: ColumnDef;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: column.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: column.width,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200 whitespace-nowrap",
        isDragging && "opacity-50 z-50",
        column.locked && "cursor-default",
        !column.locked && "cursor-move",
      )}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        {!column.locked && (
          <button
            {...listeners}
            className="p-0.5 hover:bg-gray-200 rounded opacity-50 hover:opacity-100 transition-opacity"
            aria-label={`Drag to reorder ${column.label} column`}
          >
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        {children}
      </div>
    </th>
  );
}

function MobileSubmissionCard({
  submission,
  isSelected,
  onToggleSelect,
  onClick,
}: {
  submission: Submission;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggleSelect}
            className="mt-1 p-1 hover:bg-gray-200 rounded flex-shrink-0"
            aria-label={`Select submission ${submission.submissionId}`}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {submission.firstName} {submission.lastName}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {submission.email}
                </p>
              </div>
              <StatusBadge status={submission.status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Location: </span>
                <span className="capitalize">
                  {submission.city || submission.country || "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Type: </span>
                <span className="capitalize">
                  {submission.locationType || "unknown"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Date: </span>
                <span>
                  {format(new Date(submission.submissionTime), "dd/MM/yyyy")}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Templates: </span>
                <span>{submission.assignments.length}</span>
              </div>
            </div>

            {submission.assignments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {submission.assignments.slice(0, 3).map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                  >
                    {assignment.template.name}
                  </span>
                ))}
                {submission.assignments.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                    +{submission.assignments.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionDetail | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);

  // Load column order from localStorage on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem(STORAGE_KEY);
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns) as ColumnDef[];
        // Validate that saved columns match our expected structure
        if (Array.isArray(parsed) && parsed.length === DEFAULT_COLUMNS.length) {
          // Get unlocked columns from saved order
          const unlockedColumns = parsed.filter((c) => !c.locked);
          
          // Reconstruct with locked columns in fixed positions
          const reconstructed: ColumnDef[] = [];
          let unlockedIndex = 0;
          
          for (const defaultCol of DEFAULT_COLUMNS) {
            if (defaultCol.locked) {
              reconstructed.push(defaultCol);
            } else {
              const savedCol = unlockedColumns[unlockedIndex];
              if (savedCol) {
                reconstructed.push({
                  ...savedCol,
                  label: defaultCol.label,
                  locked: false,
                  width: defaultCol.width,
                });
              } else {
                reconstructed.push(defaultCol);
              }
              unlockedIndex++;
            }
          }
          
          setColumns(reconstructed);
        }
      } catch {
        // Invalid saved data, use defaults
      }
    }
  }, []);

  // Save column order to localStorage when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // Don't allow moving locked columns
        if (items[oldIndex]?.locked || items[newIndex]?.locked) {
          return items;
        }
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (status) params.set("status", status);
      if (location) params.set("location", location);
      if (search) params.set("search", search);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const response = await fetch(`/api/submissions?${params}`);
      const data = await response.json();

      setSubmissions(data.submissions);
      setPagination(data.pagination);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [page, status, location, search, fromDate, toDate]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setLocation("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters = search || status || location || fromDate || toDate;

  const exportToCSV = () => {
    if (!submissions.length) return;

    const headers = [
      "Submission ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Church",
      "Location Type",
      "City",
      "Country",
      "Status",
      "Submission Date",
      "Assignment Count",
    ];

    const rows = submissions.map((s) => [
      s.submissionId,
      s.firstName || "",
      s.lastName || "",
      s.email || "",
      s.phone || "",
      s.church || "",
      s.locationType || "",
      s.city || "",
      s.country || "",
      s.status,
      new Date(s.submissionTime).toISOString(),
      s.assignments.length.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const dateRange =
      fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "end"}` : "";

    link.setAttribute("href", url);
    link.setAttribute("download", `submissions${dateRange}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    }
  };

  const handleBulkReprocess = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      const response = await fetch("/api/submissions/bulk/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error("Bulk reprocess failed");
      }

      const result = await response.json();
      await fetchSubmissions();
      alert(`Re-processed ${result.processed} submissions successfully`);
    } catch (error) {
      console.error("Bulk reprocess error:", error);
      alert("Failed to re-process submissions");
    } finally {
      setBulkProcessing(false);
    }
  };

  const openSubmissionDetail = async (submissionId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error("Failed to load submission details");
      }
      const data = await response.json();
      setSelectedSubmission(data);
    } catch (error) {
      setSelectedSubmission(null);
      setDetailError(
        error instanceof Error
          ? error.message
          : "Failed to load submission details",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeSubmissionDetail = () => {
    setDetailOpen(false);
    setDetailError(null);
  };

  const formatAnswerValue = (value: string | null, rawValue: unknown) => {
    if (value && value.trim().length > 0) {
      return {
        display: value,
        rawDisplay:
          rawValue != null && rawValue !== value
            ? JSON.stringify(rawValue)
            : null,
      };
    }

    if (rawValue == null) {
      return { display: "—", rawDisplay: null };
    }

    try {
      return { display: JSON.stringify(rawValue), rawDisplay: null };
    } catch {
      return { display: String(rawValue), rawDisplay: null };
    }
  };

  const renderCell = (
    submission: Submission,
    columnId: string,
  ): React.ReactNode => {
    switch (columnId) {
      case "checkbox":
        return (
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleSelection(submission.id);
            }}
            aria-label={`Select submission ${submission.submissionId}`}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {selectedIds.has(submission.id) ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        );
      case "person":
        return (
          <div className="block">
            <p className="font-medium text-gray-900">
              {submission.firstName} {submission.lastName}
            </p>
            <p className="text-sm text-gray-500 truncate max-w-[180px]">
              {submission.email}
            </p>
          </div>
        );
      case "submissionId":
        return (
          <span className="text-xs font-mono text-gray-600 truncate block max-w-[140px]">
            {submission.submissionId}
          </span>
        );
      case "date":
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            {format(new Date(submission.submissionTime), "dd/MM/yyyy")}
          </div>
        );
      case "status":
        return <StatusBadge status={submission.status} />;
      case "location":
        return (
          <div>
            <div className="text-sm text-gray-900 truncate max-w-[130px]">
              {submission.city || submission.country || "Unknown"}
            </div>
            <div className="text-xs text-gray-500 capitalize truncate max-w-[130px]">
              {submission.locationType || "unknown"}
            </div>
          </div>
        );
      case "phone":
        return (
          <span className="text-sm text-gray-600 truncate block max-w-[120px]">
            {submission.phone || "—"}
          </span>
        );
      case "church":
        return (
          <span className="text-sm text-gray-600 truncate block max-w-[140px]">
            {submission.church || "—"}
          </span>
        );
      case "templates":
        return (
          <div className="flex flex-wrap gap-1">
            {submission.assignments.slice(0, 2).map((assignment) => (
              <span
                key={assignment.id}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 truncate max-w-[90px]"
                title={assignment.template.name}
              >
                {assignment.template.name}
              </span>
            ))}
            {submission.assignments.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                +{submission.assignments.length - 2}
              </span>
            )}
            {submission.assignments.length === 0 && (
              <span className="text-xs text-gray-400">None</span>
            )}
          </div>
        );
      case "country":
        return (
          <span className="text-sm text-gray-600 truncate block max-w-[100px]">
            {submission.country || "—"}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Submissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and review form submissions
          </p>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </span>
          <span>{showMobileFilters ? "−" : "+"}</span>
        </Button>
      </div>

      {/* Filters */}
      <div
        className={cn(
          "bg-white p-4 rounded-xl border border-gray-200",
          !showMobileFilters && "hidden md:block",
        )}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Row 1: Search and Status */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or submission ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <MapPin className="w-5 h-5 text-gray-400 hidden sm:block" />
                <select
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Locations</option>
                  <option value="romania">Romania</option>
                  <option value="diaspora">Diaspora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Date Range and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <span className="text-sm text-gray-600 ml-2">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={exportToCSV}
                disabled={!submissions.length}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium text-sm">
              {selectedIds.size} submission{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
          </div>

          <button
            onClick={handleBulkReprocess}
            disabled={bulkProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 text-sm w-full sm:w-auto justify-center"
          >
            {bulkProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                Re-process
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Count */}
      {pagination && (
        <div className="text-sm text-gray-500">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} results
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && submissions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No submissions found
        </div>
      )}

      {/* Desktop: Table */}
      {!loading && submissions.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 w-full">
            <div className="overflow-x-auto w-full">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((c) => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <table className="min-w-max">
                    <thead>
                      <tr>
                        {columns.map((column) => {
                          if (column.id === "checkbox") {
                            return (
                              <th
                                key={column.id}
                                className="px-4 py-3 bg-gray-50 border-b border-gray-200"
                                style={{ width: column.width }}
                              >
                                <button
                                  onClick={toggleAllSelection}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {selectedIds.size === submissions.length &&
                                  submissions.length > 0 ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
                              </th>
                            );
                          }
                          return (
                            <SortableHeader key={column.id} column={column}>
                              {column.label}
                            </SortableHeader>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "hover:bg-gray-50 cursor-pointer",
                        selectedIds.has(submission.id) && "bg-blue-50",
                      )}
                      onClick={() => openSubmissionDetail(submission.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSubmissionDetail(submission.id);
                        }
                      }}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "py-4",
                            column.id === "checkbox" ? "px-4" : "px-6",
                          )}
                          style={{ width: column.width }}
                        >
                          {renderCell(submission, column.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {submissions.map((submission) => (
              <MobileSubmissionCard
                key={submission.id}
                submission={submission}
                isSelected={selectedIds.has(submission.id)}
                onToggleSelect={(e) => {
                  e.stopPropagation();
                  toggleSelection(submission.id);
                }}
                onClick={() => openSubmissionDetail(submission.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-gray-500 hidden sm:block">
            Page {page} of {pagination.pages}
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="sm:hidden">Previous</span>
            </button>

            <span className="text-sm text-gray-600 px-4">
              {page} / {pagination.pages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSubmissionDetail();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] sm:w-full p-4 sm:p-6"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedSubmission
                ? `${selectedSubmission.firstName ?? "Unknown"} ${selectedSubmission.lastName ?? ""}`
                : "Submission Details"}
            </DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {detailError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {detailError}
            </div>
          )}

          {!detailLoading && !detailError && selectedSubmission && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {selectedSubmission.firstName} {selectedSubmission.lastName}
                  </h1>
                  <StatusBadge status={selectedSubmission.status} />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Submission ID
                  </p>
                  <p className="text-sm font-bold text-slate-900 font-mono truncate">
                    {selectedSubmission.submissionId}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Submitted
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {format(
                      new Date(selectedSubmission.submissionTime),
                      "dd MMM yyyy",
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Location
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedSubmission.city ||
                      selectedSubmission.country ||
                      "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Assignments
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedSubmission.assignments.length}
                  </p>
                </div>
              </div>

              {/* Contact & Location Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Contact Information
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-slate-900 break-all">
                          {selectedSubmission.email ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedSubmission.phone ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Church</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedSubmission.church ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <MapPinned className="w-3 h-3" />
                    Location
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {selectedSubmission.locationType ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinned className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">City</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedSubmission.city ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinned className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedSubmission.country ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments Section */}
              {selectedSubmission.assignments.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Assignments ({selectedSubmission.assignments.length})
                  </label>
                  <div className="space-y-2">
                    {selectedSubmission.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {assignment.template.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Template Assignment
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-extrabold uppercase"
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answers Section */}
              {selectedSubmission.answers.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    Answers ({selectedSubmission.answers.length})
                  </label>
                  <div className="space-y-2">
                    {selectedSubmission.answers.map((answer) => {
                      const formatted = formatAnswerValue(
                        answer.value,
                        answer.rawValue,
                      );
                      return (
                        <div
                          key={answer.id}
                          className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-xl"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {answer.question.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">
                            {formatted.display}
                          </p>
                          {formatted.rawDisplay && (
                            <p className="mt-2 text-xs text-gray-500 font-mono">
                              Raw: {formatted.rawDisplay}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
