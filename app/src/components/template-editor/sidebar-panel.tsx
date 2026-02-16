// ABOUTME: Enhanced sidebar panel with placeholders, version history, template metadata, and actions
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { TemplateVersion } from './types'
import {
  CheckCircle,
  Plus,
  History,
  Tag,
  ChevronRight,
  Search,
  Copy,
  Trash2,
  FileText,
  Info
} from 'lucide-react'

interface SidebarPanelProps {
  placeholders: string[]
  versions: TemplateVersion[]
  selectedVersionId: string | null
  editorInstance: unknown | null
  templateName?: string
  templateSlug?: string
  onInsertPlaceholder: (placeholder: string) => void
  onSelectVersion: (version: TemplateVersion) => void
  onCreateVersion: () => void
  onDuplicateVersion?: (versionId: string) => void
  onDeleteVersion?: (versionId: string) => void
}

const AVAILABLE_PLACEHOLDERS = [
  { category: 'Contact Info', items: ['FirstName', 'LastName', 'Email'] },
  { category: 'Prayer Context', items: ['Missionary', 'EthnicGroup', 'Location'] },
  { category: 'Submission', items: ['SubmissionDate', 'ResponseId'] },
  { category: 'Custom', items: ['Organization', 'Campaign', 'ReferralCode'] }
]

export function SidebarPanel({
  placeholders,
  versions,
  selectedVersionId,
  editorInstance,
  templateName,
  templateSlug,
  onInsertPlaceholder,
  onSelectVersion,
  onCreateVersion,
  onDuplicateVersion,
  onDeleteVersion
}: SidebarPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false)

  // Filter placeholders based on search
  const filteredPlaceholders = AVAILABLE_PLACEHOLDERS.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

  const publishedVersion = versions.find(v => v.isPublished)
  const selectedVersion = versions.find(v => v.id === selectedVersionId)

  return (
    <div className="space-y-5">
      {/* Template Info Section */}
      {(templateName || templateSlug) && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Template Info</h3>
            </div>
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
              {templateName && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">Name</Label>
                  <p className="text-sm font-medium truncate">{templateName}</p>
                </div>
              )}
              {templateSlug && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase">Slug</Label>
                  <p className="text-xs font-mono text-muted-foreground truncate">{templateSlug}</p>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Placeholders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Placeholders</h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {placeholders.length} used
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <ScrollArea className={cn(
          "pr-2",
          showAllPlaceholders ? "h-[280px]" : "h-auto max-h-[200px]"
        )}>
          <div className="space-y-3">
            {filteredPlaceholders.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No placeholders found</p>
            ) : (
              filteredPlaceholders.map((group) => (
                <div key={group.category} className="space-y-1.5">
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {group.items.map((item) => {
                      const isUsed = placeholders.includes(item)
                      return (
                        <Button
                          key={item}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-between h-7 px-2 text-xs font-mono hover:bg-accent group",
                            isUsed && "bg-blue-50/50 text-blue-700 hover:bg-blue-50"
                          )}
                          onClick={() => onInsertPlaceholder(item)}
                          disabled={!editorInstance}
                          title={isUsed ? 'Used in template' : 'Click to insert'}
                        >
                          <span>{'{{'}{item}{'}}'}</span>
                          {isUsed && (
                            <Badge variant="outline" className="h-4 text-[8px] px-1 bg-blue-100 border-blue-200">
                              used
                            </Badge>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground"
          onClick={() => setShowAllPlaceholders(!showAllPlaceholders)}
        >
          {showAllPlaceholders ? 'Show less' : 'Show more'}
        </Button>
      </div>

      <Separator />

      {/* Version History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Versions</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onCreateVersion}
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>

        <ScrollArea className="h-auto max-h-[280px] pr-2">
          <div className="space-y-1.5">
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No versions yet</p>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className={cn(
                    'group relative p-2.5 rounded-lg border transition-all',
                    selectedVersionId === version.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border bg-muted/30'
                  )}
                >
                  <button
                    onClick={() => onSelectVersion(version)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-xs truncate">
                        v{version.versionNumber}: {version.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {version.isPublished ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(version.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {version.isPublished && (
                        <Badge variant="default" className="text-[8px] h-3.5 px-1 bg-green-600">
                          LIVE
                        </Badge>
                      )}
                      {!version.isPublished && selectedVersionId === version.id && (
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                          EDITING
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Version Actions */}
                  {selectedVersionId === version.id && !version.isPublished && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-dashed">
                      {onDuplicateVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onDuplicateVersion(version.id)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      )}
                      {onDeleteVersion && versions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDeleteVersion(version.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Template Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted">
            <div className="text-xl font-semibold">{placeholders.length}</div>
            <div className="text-[10px] text-muted-foreground">Placeholders</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted">
            <div className="text-xl font-semibold">{versions.length}</div>
            <div className="text-[10px] text-muted-foreground">Versions</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted">
            <div className="text-xl font-semibold">
              {publishedVersion ? `v${publishedVersion.versionNumber}` : '-'}
            </div>
            <div className="text-[10px] text-muted-foreground">Published</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted">
            <div className="text-xl font-semibold">
              {selectedVersion ? selectedVersion.subject.length : 0}
            </div>
            <div className="text-[10px] text-muted-foreground">Subject chars</div>
          </div>
        </div>
      </div>
    </div>
  )
}
