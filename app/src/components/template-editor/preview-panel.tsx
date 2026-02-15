// ABOUTME: Preview panel component showing live email preview with submission selector
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, User, AlertTriangle } from 'lucide-react'

interface Submission {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface PreviewPanelProps {
  html: string
  text: string
  subject: string
  warnings: string[]
  selectedSubmission: Submission | null
  submissions: Submission[]
  onSubmissionChange: (submissionId: string) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function PreviewPanel({
  html,
  text,
  subject,
  warnings,
  selectedSubmission,
  submissions,
  onSubmissionChange,
  onRefresh,
  isLoading
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState('rendered')

  return (
    <div className="space-y-4">
      {/* Submission Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Preview as
        </Label>
        <Select
          value={selectedSubmission?.id || ''}
          onValueChange={onSubmissionChange}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select a person..." />
          </SelectTrigger>
          <SelectContent>
            {submissions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span>{sub.firstName} {sub.lastName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Person Info */}
      {selectedSubmission && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-900">
            <User className="w-4 h-4 shrink-0" />
            <span className="font-medium truncate">
              {selectedSubmission.firstName} {selectedSubmission.lastName}
            </span>
          </div>          <div className="text-xs text-blue-700 mt-1 truncate pl-6">
            {selectedSubmission.email}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onRefresh}
        disabled={isLoading}
      >
        <Eye className="w-4 h-4 mr-2" />
        {isLoading ? 'Generating...' : 'Refresh Preview'}
      </Button>

      {/* Subject Display */}
      {subject && (
        <div className="space-y-1 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Subject:</span>
          <p className="text-sm font-medium truncate">{subject}</p>
        </div>
      )}

      {/* Preview Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="rendered" className="text-xs">Email</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">HTML</TabsTrigger>
          <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
        </TabsList>

        <TabsContent value="rendered" className="mt-3">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div
              className="text-[14px] leading-7 text-gray-900 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted-foreground italic">No content to preview</p>' }}
            />
          </div>
        </TabsContent>

        <TabsContent value="raw" className="mt-3">
          <pre className="border rounded-lg p-3 bg-muted whitespace-pre-wrap font-mono text-[10px] leading-relaxed max-h-[400px] overflow-auto">
            {html || '// No HTML content'}
          </pre>
        </TabsContent>

        <TabsContent value="text" className="mt-3">
          <pre className="border rounded-lg p-3 bg-muted whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[400px] overflow-auto">
            {text || '// No text content'}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}
