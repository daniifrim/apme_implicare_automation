// ABOUTME: Displays detailed submission view with assignments and answers
// ABOUTME: Supports editing and reprocessing for a single submission record
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  RotateCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  status: string;
  reasonCodes: string[];
  template: {
    id: string;
    name: string;
    slug: string;
  };
  version?: {
    id: string;
    versionNumber: number;
    name: string;
  };
}

interface Answer {
  id: string;
  value: string | null;
  rawValue: unknown;
  question: {
    id: string;
    name: string;
  };
}

interface Submission {
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
  assignments: Assignment[];
  answers: Answer[];
}

interface Template {
  id: string;
  name: string;
  slug: string;
}

export default function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    locationType: "",
    city: "",
    country: "",
    church: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);

  // Assignment management state
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [addingAssignment, setAddingAssignment] = useState(false);

  // Expand/collapse answers
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
    new Set(),
  );

  const fetchSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/submissions/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/submissions");
          return;
        }
        throw new Error("Failed to fetch submission");
      }

      const data = await response.json();
      setSubmission(data);
      setEditForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phone: data.phone || "",
        locationType: data.locationType || "",
        city: data.city || "",
        country: data.country || "",
        church: data.church || "",
        status: data.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }, []);

  useEffect(() => {
    fetchSubmission();
    fetchTemplates();
  }, [fetchSubmission, fetchTemplates]);

  async function handleSaveEdit() {
    if (!submission) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      const updated = await response.json();
      setSubmission(updated);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAssignment() {
    if (!submission || !selectedTemplateId) return;

    setAddingAssignment(true);
    try {
      const response = await fetch(
        `/api/submissions/${submission.id}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add assignment");
      }

      await fetchSubmission();
      setShowAddAssignment(false);
      setSelectedTemplateId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add assignment");
    } finally {
      setAddingAssignment(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove assignment");
      }

      await fetchSubmission();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove assignment");
    }
  }

  async function handleUpdateAssignmentStatus(
    assignmentId: string,
    newStatus: string,
  ) {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      await fetchSubmission();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleReprocess() {
    if (!submission) return;

    try {
      const response = await fetch("/api/submissions/bulk/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIds: [submission.id] }),
      });

      if (!response.ok) {
        throw new Error("Failed to reprocess");
      }

      await fetchSubmission();
      alert("Submission re-processed successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reprocess");
    }
  }

  const toggleAnswerExpand = (answerId: string) => {
    const newExpanded = new Set(expandedAnswers);
    if (newExpanded.has(answerId)) {
      newExpanded.delete(answerId);
    } else {
      newExpanded.add(answerId);
    }
    setExpandedAnswers(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || "Submission not found"}</p>
        <Link
          href="/submissions"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Back to submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/submissions"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                  placeholder="First name"
                  className="px-3 py-1 border rounded text-lg font-bold w-32"
                />
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  className="px-3 py-1 border rounded text-lg font-bold w-32"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {submission.firstName ?? "Unknown"} {submission.lastName ?? ""}
              </h1>
            )}

            <Badge variant="outline" className="font-mono text-[10px]">
              {submission.submissionId}
            </Badge>

            {isEditing ? (
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
              </select>
            ) : (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  submission.status === "processed" &&
                    "bg-green-100 text-green-800",
                  submission.status === "pending" &&
                    "bg-yellow-100 text-yellow-800",
                  submission.status === "failed" && "bg-red-100 text-red-800",
                )}
              >
                {submission.status}
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground mt-1 ml-10">
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="Email"
                className="px-2 py-1 border rounded w-64"
              />
            ) : (
              <>
                {submission.email ?? "No email"} •{" "}
                {new Date(submission.submissionTime).toLocaleString()}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    firstName: submission.firstName || "",
                    lastName: submission.lastName || "",
                    email: submission.email || "",
                    phone: submission.phone || "",
                    locationType: submission.locationType || "",
                    city: submission.city || "",
                    country: submission.country || "",
                    church: submission.church || "",
                    status: submission.status,
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReprocess}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
              >
                <RotateCw className="w-4 h-4" />
                Re-process
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Assigned Templates */}
        <div className="bg-card border rounded-custom p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Assigned Templates
            </div>
            <button
              onClick={() => setShowAddAssignment(!showAddAssignment)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {showAddAssignment && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Select a template...</option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAssignment}
                  disabled={!selectedTemplateId || addingAssignment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {addingAssignment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddAssignment(false);
                    setSelectedTemplateId("");
                  }}
                  className="p-2 hover:bg-blue-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {submission.assignments.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">
              No assignments recorded.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {submission.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-custom hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {a.template.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.version
                        ? `v${a.version.versionNumber}: ${a.version.name}`
                        : "No version"}
                    </div>
                    {a.reasonCodes?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {a.reasonCodes.join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={a.status}
                      onChange={(e) =>
                        handleUpdateAssignmentStatus(a.id, e.target.value)
                      }
                      className={cn(
                        "px-2 py-1 text-xs border rounded",
                        a.status === "pending" &&
                          "bg-yellow-50 border-yellow-200",
                        a.status === "sent" && "bg-green-50 border-green-200",
                        a.status === "failed" && "bg-red-50 border-red-200",
                        a.status === "cancelled" &&
                          "bg-gray-50 border-gray-200",
                      )}
                    >
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleRemoveAssignment(a.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                      title="Remove assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Profile
          </div>

          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Location</span>
              {isEditing ? (
                <select
                  value={editForm.locationType}
                  onChange={(e) =>
                    setEditForm({ ...editForm, locationType: e.target.value })
                  }
                  className="px-2 py-1 border rounded"
                >
                  <option value="">Unknown</option>
                  <option value="romania">Romania</option>
                  <option value="diaspora">Diaspora</option>
                </select>
              ) : (
                <span className="font-medium capitalize">
                  {submission.locationType ?? "unknown"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">City</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value })
                  }
                  className="px-2 py-1 border rounded w-32"
                />
              ) : (
                <span className="font-medium">{submission.city ?? "—"}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Country</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value })
                  }
                  className="px-2 py-1 border rounded w-32"
                />
              ) : (
                <span className="font-medium">{submission.country ?? "—"}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Church</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.church}
                  onChange={(e) =>
                    setEditForm({ ...editForm, church: e.target.value })
                  }
                  className="px-2 py-1 border rounded w-32"
                />
              ) : (
                <span className="font-medium">{submission.church ?? "—"}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="px-2 py-1 border rounded w-32"
                />
              ) : (
                <span className="font-medium">{submission.phone ?? "—"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="bg-card border rounded-custom overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Answers ({submission.answers.length})
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {submission.answers.map((a) => {
                const isExpanded = expandedAnswers.has(a.id);
                const displayValue = a.value ?? "—";
                const isLong = displayValue.length > 100;

                return (
                  <tr key={a.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {a.question.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {isExpanded || !isLong ? (
                        displayValue
                      ) : (
                        <>{displayValue.slice(0, 100)}...</>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isLong && (
                        <button
                          onClick={() => toggleAnswerExpand(a.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {submission.answers.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-sm text-muted-foreground"
                    colSpan={3}
                  >
                    No answers stored.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
