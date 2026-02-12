'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Plus,
  Eye,
  CheckCircle,
  Loader2,
  User
} from 'lucide-react'
import { EmailEditor, insertPlaceholder } from '@/components/email-editor'
import { PartialBlock } from '@blocknote/core'
import { BlockNoteEditor } from '@blocknote/core'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface TemplateVersion {
  id: string
  versionNumber: number
  name: string
  subject: string
  preheader: string | null
  editorState: PartialBlock[]
  htmlContent: string
  textContent: string | null
  placeholders: string[]
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}

interface Submission {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function TemplateEditorPage() {
  const params = useParams()
  const templateId = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    html: string
    text: string
    subject: string
    submission: Submission | null
  } | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    preheader: ''
  })

  const [editorContent, setEditorContent] = useState<{
    blocks: PartialBlock[]
    html: string
    text: string
    placeholders: string[]
  }>({
    blocks: [],
    html: '',
    text: '',
    placeholders: []
  })

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
            placeholders: versionToEdit.placeholders
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

    setSaving(true)
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
      setSaving(false)
    }
  }

  async function handlePreview() {
    if (!selectedVersion) return

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
        submission: data.preview.submission
      })
      setShowPreview(true)
    } catch (error) {
      console.error('Error generating preview:', error)
    }
  }

  function handleEditorChange(
    blocks: PartialBlock[],
    html: string,
    text: string,
    placeholders: string[]
  ) {
    setEditorContent({ blocks, html, text, placeholders })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Template not found</p>
      </div>
    )
  }

  const publishedVersion = versions.find(v => v.isPublished)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/templates"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-sm text-gray-500">
              {template.slug} • {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {publishedVersion?.id === selectedVersion?.id && (
            <Badge className="bg-green-100 text-green-700">Published</Badge>
          )}
          {selectedVersion && !selectedVersion.isPublished && (
            <Badge className="bg-yellow-100 text-yellow-700">Draft</Badge>
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
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateNewVersion}
            disabled={saving}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Version
          </Button>
          <Button
            onClick={handlePublish}
            disabled={saving || !selectedVersion || selectedVersion.isPublished}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version-name">Version Name</Label>
                <Input
                  id="version-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setHasChanges(true)
                  }}
                  placeholder="e.g., Welcome Email v2"
                />
              </div>
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData({ ...formData, subject: e.target.value })
                    setHasChanges(true)
                  }}
                  placeholder="e.g., Welcome to APME!"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="preheader">Preheader Text</Label>
              <Input
                id="preheader"
                value={formData.preheader}
                onChange={(e) => {
                  setFormData({ ...formData, preheader: e.target.value })
                  setHasChanges(true)
                }}
                placeholder="Preview text that appears in email clients"
              />
            </div>

            <div>
              <Label>Email Content</Label>
              <EmailEditor
                initialContent={editorContent.blocks}
                onChange={handleEditorChange}
              />
            </div>

            {editorContent.placeholders.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">Detected placeholders:</span>
                {editorContent.placeholders.map((p) => (
                  <Badge key={p} variant="secondary">
                    {'{{'}{p}{'}}'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Placeholders */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Insert Placeholders</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => insertPlaceholderIntoEditor('FirstName')}
              >
                {'{{FirstName}}'}
              </Button>
            </div>
          </div>

          {/* Version History */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Version History</h3>
            <div className="space-y-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
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
                        placeholders: version.placeholders
                      })
                    }
                    setHasChanges(false)
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    selectedVersion?.id === version.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      v{version.versionNumber}: {version.name}
                    </span>
                    {version.isPublished && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Select Person</Label>
                <Select
                  value={selectedSubmissionId}
                  onValueChange={setSelectedSubmissionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {submissions.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.firstName} {sub.lastName} ({sub.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handlePreview}
                disabled={!selectedVersion}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Email
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {previewData.submission && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <User className="w-4 h-4" />
                    Previewing as: {previewData.submission.firstName} {previewData.submission.lastName}
                  </div>
                </div>
              )}

              <div className="border-b pb-4">
                <div className="text-sm text-gray-500">Subject:</div>
                <div className="font-medium">{previewData.subject}</div>
              </div>

              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>

                <TabsContent value="html">
                  <div
                    className="border rounded-lg p-6 bg-white prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                  />
                </TabsContent>

                <TabsContent value="text">
                  <pre className="border rounded-lg p-6 bg-gray-50 whitespace-pre-wrap font-mono text-sm">
                    {previewData.text}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
