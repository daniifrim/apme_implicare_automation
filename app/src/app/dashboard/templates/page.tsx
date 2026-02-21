// ABOUTME: Displays the templates dashboard with list, search, and detail modal
// ABOUTME: Handles template creation, import, duplication, and deletion flows
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  Loader2,
  Upload,
  ArrowRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    isPublished: boolean;
    name: string;
    subject: string;
    htmlContent?: string;
    textContent?: string | null;
  }>;
  _count: {
    assignments: number;
  };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    slug: "",
    name: "",
    description: "",
  });
  const [importing, setImporting] = useState(false);

  // Template detail modal state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTemplate({ slug: "", name: "", description: "" });
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error creating template:", error);
    }
  }

  async function handleImportTemplates() {
    setImporting(true);
    try {
      const response = await fetch("/api/templates/import", {
        method: "POST",
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error importing templates:", error);
    } finally {
      setImporting(false);
    }
  }

  async function handleCardClick(template: Template) {
    setLoadingTemplateDetail(true);
    setIsDetailModalOpen(true);
    try {
      // Fetch full template details with version content
      const response = await fetch(`/api/templates/${template.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTemplate(data.template);
      } else {
        setSelectedTemplate(template);
      }
    } catch (error) {
      console.error("Error fetching template details:", error);
      setSelectedTemplate(template);
    } finally {
      setLoadingTemplateDetail(false);
    }
  }

  async function handleDuplicate() {
    if (!selectedTemplate) return;

    setDuplicating(true);
    try {
      const response = await fetch(
        `/api/templates/${selectedTemplate.id}/duplicate`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setIsDetailModalOpen(false);
        setSelectedTemplate(null);
        fetchTemplates();
        // Navigate to the new duplicated template
        router.push(`/templates/${data.template.id}/edit`);
      } else {
        console.error("Failed to duplicate template");
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!selectedTemplate) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        setIsDetailModalOpen(false);
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        console.error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    } finally {
      setDeleting(false);
    }
  }

  const publishedVersion = selectedTemplate?.versions.find(
    (v) => v.isPublished,
  );
  const latestVersion = selectedTemplate?.versions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage email templates and versions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImportTemplates}
            disabled={importing}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden sm:inline">Import from Files</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Template</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchTemplates();
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No templates yet. Create your first template to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleCardClick(template)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {template.name}
                      </h3>
                      {template.versions.some((v) => v.isPublished) && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {template.slug}
                    </p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">
                      {template.versions.length} version
                      {template.versions.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-500">
                      {template._count.assignments} assignment
                      {template._count.assignments !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      template.status === "active" &&
                        "bg-green-100 text-green-700",
                      template.status === "draft" &&
                        "bg-yellow-100 text-yellow-700",
                      template.status === "archived" &&
                        "bg-gray-100 text-gray-700",
                    )}
                  >
                    {template.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] sm:w-full p-4 sm:p-6"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedTemplate?.name || "Template Details"}
            </DialogTitle>
          </DialogHeader>
          {loadingTemplateDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            selectedTemplate && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-slate-900 truncate">
                      {selectedTemplate.name}
                    </h1>
                    {latestVersion && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium flex-shrink-0"
                      >
                        v{latestVersion.versionNumber}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/templates/${selectedTemplate.id}/edit`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDuplicate}
                      disabled={duplicating}
                    >
                      {duplicating ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1.5" />
                      )}
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Version
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {latestVersion ? latestVersion.name : "No versions"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Last Updated
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {new Date(selectedTemplate.updatedAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </p>
                    <div className="flex items-center gap-1.5">
                      {publishedVersion ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-bold text-green-700">
                            Active
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-yellow-700">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Assignments
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedTemplate._count.assignments}
                    </p>
                  </div>
                </div>

                {/* Template Preview Section */}
                {latestVersion?.htmlContent && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      Template Preview
                    </label>
                    <div
                      className="p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-xl max-h-[450px] overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: latestVersion.htmlContent.replace(
                          /\{\{([^}]+)\}\}/g,
                          '<span class="font-mono text-sm bg-blue-100/50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-bold">{{$1}}</span>',
                        ),
                      }}
                    />
                  </div>
                )}

                {/* Version History */}
                {selectedTemplate.versions.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      Version History
                    </label>
                    <div className="space-y-2">
                      {selectedTemplate.versions
                        .slice(0, 3)
                        .map((version, index) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Layers className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    v{version.versionNumber}: {version.name}
                                  </span>
                                  {version.isPublished && (
                                    <Badge className="text-[9px] font-extrabold uppercase bg-green-100 text-green-700">
                                      Current
                                    </Badge>
                                  )}
                                  {index === 0 && !version.isPublished && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] font-extrabold uppercase"
                                    >
                                      Latest
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Subject: {version.subject}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Template
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <strong>{selectedTemplate?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will permanently delete the template, all its versions, and
              any associated assignments. This action cannot be undone.
            </p>
            {selectedTemplate && selectedTemplate._count.assignments > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This template has{" "}
                  {selectedTemplate._count.assignments} assignment
                  {selectedTemplate._count.assignments !== 1 ? "s" : ""} that
                  will also be deleted.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Template
            </h2>

            <form onSubmit={createTemplate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <input
                  type="text"
                  value={newTemplate.slug}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, slug: e.target.value })
                  }
                  placeholder="e.g., welcome-email"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this template
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="e.g., Welcome Email"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of this template..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
