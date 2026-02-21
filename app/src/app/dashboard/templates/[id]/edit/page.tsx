// ABOUTME: Template editor page with two-tab layout: Editor (with Tools sidebar) and Preview
// ABOUTME: Editor tab shows form + email editor + tools sidebar, Preview tab shows rendered email
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Loader2,
  MoreVertical,
  RotateCcw,
  Send,
  X,
  History,
  LayoutTemplate,
  Eye
} from 'lucide-react'
import { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { insertPlaceholder } from '@/components/email-editor'
import {
  EditorPanel,
  PreviewPanel,
  SidebarPanel
} from '@/components/template-editor'
import type { Template, TemplateVersion, Submission, PreviewData } from '@/components/template-editor/types'
import type { EditorWarning } from '@/types/email-editor'

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('')
  const [editorInstance, setEditorInstance] = useState<BlockNoteEditor | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')
  const [editorPanelSize, setEditorPanelSize] = useState(65)

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    preheader: ''
  })

  const [editorContent, setEditorContent] = useState({
    blocks: [] as PartialBlock[],
    html: '',
    text: '',
    placeholders: [] as string[],
    warnings: [] as string[]
  })
  const [editorWarnings, setEditorWarnings] = useState<EditorWarning[]>([])
  const [lastSavedData, setLastSavedData] = useState<{formData: typeof formData, editorContent: typeof editorContent} | null>(null)

  const fetchData = async () => {
    try {
      const [templateRes, versionsRes, submissionsRes] = await Promise.all([
        fetch(`/api/templates/${templateId}`),
        fetch(`/api/templates/${templateId}/versions`),
        fetch('/api/submissions?limit=50')
      ])

      const templateData = await templateRes.json()
      const versionsData = await versionsRes.json()
      const submissionsData = await submissionsRes.json()

      setTemplate(templateData.template)
      setVersions(versionsData.versions)
      setSubmissions(submissionsData.submissions || [])

      const draftVersion = versionsData.versions.find((v: TemplateVersion) => !v.isPublished)
      const versionToEdit = draftVersion || versionsData.versions[0]

      if (versionToEdit) {
        setSelectedVersion(versionToEdit)
        setFormData({
          name: versionToEdit.name,
          subject: versionToEdit.subject,
          preheader: versionToEdit.preheader || ''
        })
        if (versionToEdit.editorState) {
          setEditorContent({
            blocks: versionToEdit.editorState as PartialBlock[],
            html: versionToEdit.htmlContent,
            text: versionToEdit.textContent || '',
            placeholders: versionToEdit.placeholders,
            warnings: []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  // Auto-generate preview when submission changes or editor content changes
  useEffect(() => {
    if (selectedVersion && selectedSubmissionId) {
      generatePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubmissionId, selectedVersion?.id])

  async function handleSaveDraft() {
    if (!selectedVersion) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/templates/${templateId}/versions/${selectedVersion.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            subject: formData.subject,
            preheader: formData.preheader,
            editorState: editorContent.blocks,
            htmlContent: editorContent.html,
            textContent: editorContent.text,
            placeholders: editorContent.placeholders
          })
        }
      )

      if (response.ok) {
        setHasChanges(false)
        setLastSavedData({ formData: { ...formData }, editorContent: { ...editorContent } })
        await fetchData()
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateNewVersion() {
    setSaving(true)
    try {
      const response = await fetch(`/api/templates/${templateId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Version ${versions.length + 1}`,
          subject: formData.subject,
          preheader: formData.preheader,
          editorState: editorContent.blocks,
          htmlContent: editorContent.html,
          textContent: editorContent.text,
          placeholders: editorContent.placeholders
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error creating version:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!selectedVersion) return

    setPublishing(true)
    try {
      const response = await fetch(
        `/api/templates/${templateId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId: selectedVersion.id })
        }
      )

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error publishing:', error)
    } finally {
      setPublishing(false)
    }
  }

  async function generatePreview() {
    if (!selectedVersion) return

    setPreviewLoading(true)
    try {
      const response = await fetch(
        `/api/templates/${templateId}/versions/${selectedVersion.id}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: selectedSubmissionId || undefined
          })
        }
      )

      const data = await response.json()
      setPreviewData({
        html: data.preview.html,
        text: data.preview.text,
        subject: data.preview.subject,
        warnings: data.preview.warnings || [],
        submission: data.preview.submission
      })
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  function handleInsertPlaceholder(placeholder: string) {
    if (!editorInstance) return
    insertPlaceholder(editorInstance, placeholder)
  }

  function handleEditorChange(
    blocks: PartialBlock[],
    html: string,
    text: string,
    placeholders: string[],
    warnings: string[]
  ) {
    setEditorContent({ blocks, html, text, placeholders, warnings })
    setHasChanges(true)
  }

  async function handleDuplicateVersion(versionId: string) {
    setDuplicating(true)
    try {
      const response = await fetch(
        `/api/templates/${templateId}/versions/${versionId}/duplicate`,
        { method: 'POST' }
      )

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error duplicating version:', error)
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDeleteVersion(versionId: string) {
    if (versions.length <= 1) {
      alert('Cannot delete the only version. Create a new version first.')
      return
    }

    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(
        `/api/templates/${templateId}/versions/${versionId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        // If we deleted the selected version, select another one
        if (selectedVersion?.id === versionId) {
          const remainingVersions = versions.filter(v => v.id !== versionId)
          const draftVersion = remainingVersions.find(v => !v.isPublished)
          handleSelectVersion(draftVersion || remainingVersions[0])
        }
        await fetchData()
      }
    } catch (error) {
      console.error('Error deleting version:', error)
    } finally {
      setDeleting(false)
    }
  }

  function handleSelectVersion(version: TemplateVersion) {
    setSelectedVersion(version)
    setFormData({
      name: version.name,
      subject: version.subject,
      preheader: version.preheader || ''
    })
    if (version.editorState) {
      setEditorContent({
        blocks: version.editorState as PartialBlock[],
        html: version.htmlContent,
        text: version.textContent || '',
        placeholders: version.placeholders,
        warnings: []
      })
    }
    setEditorWarnings([])
    setHasChanges(false)
    setLastSavedData(null)
  }

  function handleDiscardChanges() {
    if (!lastSavedData) {
      // If no last saved data, revert to selected version
      if (selectedVersion) {
        handleSelectVersion(selectedVersion)
      }
      return
    }

    setFormData(lastSavedData.formData)
    setEditorContent(lastSavedData.editorContent)
    setHasChanges(false)
  }

  // Handle tab change - generate preview when switching to preview tab
  function handleTabChange(value: string) {
    setActiveTab(value)
    if (value === 'preview' && selectedVersion) {
      generatePreview()
    }
  }

  const selectedSubmission = submissions.find(s => s.id === selectedSubmissionId) || null
  const publishedVersion = versions.find(v => v.isPublished)
  const isPublished = selectedVersion?.id === publishedVersion?.id

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/templates"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">
              {template.slug} • {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isPublished && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Published</Badge>
          )}
          {selectedVersion && !selectedVersion.isPublished && (
            <Badge variant="secondary">Draft</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1.5 mr-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}

          {/* Save Button */}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
            className="hidden sm:flex"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>

          {/* Publish Button */}
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={publishing || !selectedVersion || selectedVersion.isPublished}
            className="hidden sm:flex"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>

          {/* Mobile Save Button (Icon only) */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
            className="sm:hidden"
            title="Save Draft"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>

          {/* Mobile Publish Button (Icon only) */}
          <Button
            size="icon"
            onClick={() => setShowPublishDialog(true)}
            disabled={publishing || !selectedVersion || selectedVersion.isPublished}
            className="sm:hidden"
            title="Publish"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleDiscardChanges}
                disabled={!hasChanges}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard Changes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateNewVersion}>
                <History className="w-4 h-4 mr-2" />
                New Version
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/templates" className="cursor-pointer">
                  <X className="w-4 h-4 mr-2" />
                  Close Editor
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Two-Tab Layout */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 shrink-0 mb-4">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            <span>Editor</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab - Shows Editor + Tools in resizable panels */}
        <TabsContent value="editor" className="flex-1 min-h-0 mt-0 data-[state=active]:flex">
          {/* Mobile: Stacked vertical layout */}
          <div className="flex flex-col lg:hidden flex-1 gap-4 overflow-auto">
            {/* Editor Panel */}
            <div className="flex-1 min-h-[400px] rounded-xl border bg-background shadow-sm flex flex-col">
              {/* Panel Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                  <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Editor</span>
                  <span className="text-xs text-muted-foreground">Content & Settings</span>
                </div>
              </div>
              {/* Panel Content */}
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-4xl mx-auto">
                  <EditorPanel
                    formData={formData}
                    editorContent={editorContent}
                    editorWarnings={editorWarnings}
                    onFormChange={(data) => {
                      setFormData(data)
                      setHasChanges(true)
                    }}
                    onEditorChange={handleEditorChange}
                    onEditorReady={setEditorInstance}
                    onValidationChange={setEditorWarnings}
                  />
                </div>
              </div>
            </div>

            {/* Tools Sidebar */}
            <div className="min-h-[300px] rounded-xl border bg-background shadow-sm flex flex-col">
              {/* Panel Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Tools</span>
                  <span className="text-xs text-muted-foreground">Placeholders & Versions</span>
                </div>
              </div>
              {/* Panel Content */}
              <div className="flex-1 overflow-auto">
                <SidebarPanel
                  placeholders={editorContent.placeholders}
                  versions={versions}
                  selectedVersionId={selectedVersion?.id || null}
                  editorInstance={editorInstance}
                  templateName={template?.name}
                  templateSlug={template?.slug}
                  onInsertPlaceholder={handleInsertPlaceholder}
                  onSelectVersion={handleSelectVersion}
                  onCreateVersion={handleCreateNewVersion}
                  onDuplicateVersion={handleDuplicateVersion}
                  onDeleteVersion={handleDeleteVersion}
                />
              </div>
            </div>
          </div>

          {/* Desktop: Resizable panels */}
          <ResizablePanelGroup
            orientation="horizontal"
            className="hidden lg:flex flex-1 rounded-xl border bg-background shadow-sm"
            onLayoutChanged={(layout) => {
              const sizes = Object.values(layout)
              if (sizes.length === 2) {
                setEditorPanelSize(sizes[0])
              }
            }}
          >
            {/* Editor Panel */}
            <ResizablePanel
              defaultSize={65}
              minSize={50}
              maxSize={80}
              className="min-w-[400px]"
            >
              <div className="h-full flex flex-col">
                {/* Panel Header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                    <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Editor</span>
                    <span className="text-xs text-muted-foreground">Content & Settings</span>
                  </div>
                </div>
                {/* Panel Content */}
                <div className="flex-1 overflow-auto p-4">
                  <div className="max-w-4xl mx-auto">
                    <EditorPanel
                      formData={formData}
                      editorContent={editorContent}
                      editorWarnings={editorWarnings}
                      onFormChange={(data) => {
                        setFormData(data)
                        setHasChanges(true)
                      }}
                      onEditorChange={handleEditorChange}
                      onEditorReady={setEditorInstance}
                      onValidationChange={setEditorWarnings}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/50 hover:bg-border transition-colors" />

            {/* Tools Sidebar */}
            <ResizablePanel
              defaultSize={35}
              minSize={25}
              maxSize={50}
              className="min-w-[280px]"
            >
              <div className="h-full flex flex-col">
                {/* Panel Header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Tools</span>
                    <span className="text-xs text-muted-foreground">Placeholders & Versions</span>
                  </div>
                </div>
                {/* Panel Content */}
                <div className="flex-1 overflow-auto">
                  <SidebarPanel
                    placeholders={editorContent.placeholders}
                    versions={versions}
                    selectedVersionId={selectedVersion?.id || null}
                    editorInstance={editorInstance}
                    templateName={template?.name}
                    templateSlug={template?.slug}
                    onInsertPlaceholder={handleInsertPlaceholder}
                    onSelectVersion={handleSelectVersion}
                    onCreateVersion={handleCreateNewVersion}
                    onDuplicateVersion={handleDuplicateVersion}
                    onDeleteVersion={handleDeleteVersion}
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        {/* Preview Tab - Shows full preview */}
        <TabsContent value="preview" className="flex-1 min-h-0 mt-0 data-[state=active]:flex">
          <div className="flex-1 rounded-xl border bg-background shadow-sm overflow-hidden">
            <PreviewPanel
              html={previewData?.html || editorContent.html}
              text={previewData?.text || editorContent.text}
              subject={previewData?.subject || formData.subject}
              warnings={previewData?.warnings || []}
              selectedSubmission={selectedSubmission}
              submissions={submissions}
              onSubmissionChange={setSelectedSubmissionId}
              onRefresh={generatePreview}
              isLoading={previewLoading}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Publish Version
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to publish <strong>{selectedVersion?.name}</strong>?
              This will make it the active version for all new emails.
            </DialogDescription>
          </DialogHeader>

          {publishedVersion && publishedVersion.id !== selectedVersion?.id && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <History className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Replacing Current Published Version
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    v{publishedVersion.versionNumber}: {publishedVersion.name} is currently published.
                    Publishing this version will replace it.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 my-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Version:</span>{' '}
              <span className="font-medium">v{selectedVersion?.versionNumber}: {selectedVersion?.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Subject:</span>{' '}
              <span className="font-medium">{selectedVersion?.subject}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Placeholders:</span>{' '}
              <span className="font-medium">{selectedVersion?.placeholders.length || 0}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await handlePublish()
                setShowPublishDialog(false)
              }}
              disabled={publishing}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Publish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
