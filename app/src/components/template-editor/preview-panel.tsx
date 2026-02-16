// ABOUTME: Preview panel component with device switching, live email preview, and submission selector
// ABOUTME: Supports Desktop/Tablet/Mobile viewport simulation
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Eye, User, AlertTriangle, Monitor, Tablet, Smartphone, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Submission {
  id: string
  firstName: string
  lastName: string
  email: string
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

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

const DEVICE_CONFIG: Record<DeviceType, { width: string; label: string; icon: typeof Monitor }> = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone }
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
  const [device, setDevice] = useState<DeviceType>('desktop')

  const DeviceIcon = DEVICE_CONFIG[device].icon

  return (
    <div className="space-y-4">
      {/* Device Switcher */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Device Preview
        </Label>
        <ToggleGroup
          type="single"
          value={device}
          onValueChange={(v) => v && setDevice(v as DeviceType)}
          className="w-full grid grid-cols-3"
        >
          {(Object.keys(DEVICE_CONFIG) as DeviceType[]).map((d) => {
            const Icon = DEVICE_CONFIG[d].icon
            return (
              <ToggleGroupItem
                key={d}
                value={d}
                aria-label={DEVICE_CONFIG[d].label}
                className="text-xs"
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {DEVICE_CONFIG[d].label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

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
          </div>
          <div className="text-xs text-blue-700 mt-1 truncate pl-6">
            {selectedSubmission.email}
          </div>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <Eye className="w-4 h-4 mr-2" />
          {isLoading ? 'Generating...' : 'Refresh'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDevice('desktop')}
          title="Reset to desktop view"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

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
          <div className="flex justify-center overflow-auto">
            <div
              className={cn(
                'rounded-lg border bg-white shadow-sm transition-all duration-300',
                device === 'mobile' && 'border-gray-300 shadow-lg'
              )}
              style={{ width: DEVICE_CONFIG[device].width, maxWidth: '100%' }}
            >
              {/* Device Frame Header for Mobile/Tablet */}
              {device !== 'desktop' && (
                <div className="h-6 bg-gray-100 rounded-t-lg border-b flex items-center justify-center gap-1">
                  <div className="w-16 h-1 bg-gray-300 rounded-full" />
                </div>
              )}
              <div className="p-4">
                <div
                  className="text-[14px] leading-7 text-gray-900 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted-foreground italic">No content to preview</p>' }}
                />
              </div>
              {/* Device Frame Footer for Mobile */}
              {device === 'mobile' && (
                <div className="h-6 bg-gray-100 rounded-b-lg border-t flex items-center justify-center">
                  <div className="w-8 h-1 bg-gray-300 rounded-full" />
                </div>
              )}
            </div>
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
