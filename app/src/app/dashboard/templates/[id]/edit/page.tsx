// ABOUTME: Redesigned template editor page with three-column resizable layout
// ABOUTME: Editor 60%, Preview 25%, Sidebar 15% with responsive tab fallback
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { insertPlaceholder } from '@/components/email-editor'
import {
  TemplateEditorLayout,
  EditorPanel,
  PreviewPanel,
  SidebarPanel
} from '@/components/template-editor'
import type { Template, TemplateVersion, Submission, PreviewData } from '@/components/template-editor/types'
import type { EditorWarning } from '@/types/email-editor'

export default function TemplateEditorPage() {
  const params = useParams()
  const templateId = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('')
  const [editorInstance, setEditorInstance] = useState<BlockNoteEditor | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

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
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
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
          <Button
            onClick={handlePublish}
            disabled={publishing || !selectedVersion || selectedVersion.isPublished}
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Three-Column Layout */}
      <TemplateEditorLayout
        editor={
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
        }
        preview={
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
        }
        sidebar={
          <SidebarPanel
            placeholders={editorContent.placeholders}
            versions={versions}
            selectedVersionId={selectedVersion?.id || null}
            editorInstance={editorInstance}
            onInsertPlaceholder={handleInsertPlaceholder}
            onSelectVersion={handleSelectVersion}
            onCreateVersion={handleCreateNewVersion}
          />
        }
      />
    </div>
  )
}
