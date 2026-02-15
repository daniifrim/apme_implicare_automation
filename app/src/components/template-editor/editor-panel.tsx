// ABOUTME: Editor panel component containing the email editor and template form fields
'use client'

import { EmailEditor } from '@/components/email-editor'
import { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { EditorWarning } from '@/types/email-editor'

interface EditorPanelProps {
  formData: {
    name: string
    subject: string
    preheader: string
  }
  editorContent: {
    blocks: PartialBlock[]
    html: string
    text: string
    placeholders: string[]
    warnings: string[]
  }
  editorWarnings: EditorWarning[]
  onFormChange: (data: { name: string; subject: string; preheader: string }) => void
  onEditorChange: (
    blocks: PartialBlock[],
    html: string,
    text: string,
    placeholders: string[],
    warnings: string[]
  ) => void
  onEditorReady: (editor: BlockNoteEditor) => void
  onValidationChange: (warnings: EditorWarning[]) => void
}

export function EditorPanel({
  formData,
  editorContent,
  editorWarnings,
  onFormChange,
  onEditorChange,
  onEditorReady,
  onValidationChange
}: EditorPanelProps) {
  const handleFormChange = (field: keyof typeof formData, value: string) => {
    onFormChange({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="version-name" className="text-sm font-medium">
            Version Name
          </Label>
          <Input
            id="version-name"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="e.g., Welcome Email v2"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-sm font-medium">
            Email Subject
          </Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleFormChange('subject', e.target.value)}
            placeholder="e.g., Welcome to APME!"
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preheader" className="text-sm font-medium">
          Preheader Text
        </Label>
        <Input
          id="preheader"
          value={formData.preheader}
          onChange={(e) => handleFormChange('preheader', e.target.value)}
          placeholder="Preview text that appears in email clients"
          className="h-10"
        />
      </div>

      {/* Email Editor */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email Content</Label>
        <div className="border rounded-lg overflow-hidden">
          <EmailEditor
            initialContent={editorContent.blocks}
            onChange={onEditorChange}
            onEditorReady={onEditorReady}
            onValidationChange={onValidationChange}
            showBlockHandles={false}
            allowedFeatures={{
              paragraphs: true,
              lineBreaks: true,
              links: true,
              lists: true,
              placeholders: true
            }}
          />
        </div>
      </div>

      {/* Warnings */}
      {editorWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-900 mb-2">
            Compatibility Warnings
          </div>
          <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
            {editorWarnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detected Placeholders */}
      {editorContent.placeholders.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <span className="text-sm text-muted-foreground">Detected placeholders:</span>
          {editorContent.placeholders.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-xs">
              {'{{'}{p}{'}}'}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
