// ABOUTME: Sidebar panel component with placeholders, version history, and actions
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { TemplateVersion } from './types'
import {
  CheckCircle,
  Plus,
  History,
  Tag,
  ChevronRight
} from 'lucide-react'

interface SidebarPanelProps {
  placeholders: string[]
  versions: TemplateVersion[]
  selectedVersionId: string | null
  editorInstance: unknown | null
  onInsertPlaceholder: (placeholder: string) => void
  onSelectVersion: (version: TemplateVersion) => void
  onCreateVersion: () => void
}

const AVAILABLE_PLACEHOLDERS = [
  { category: 'Contact Info', items: ['FirstName', 'LastName', 'Email'] },
  { category: 'Prayer Context', items: ['Missionary', 'EthnicGroup', 'Location'] },
  { category: 'Submission', items: ['SubmissionDate', 'ResponseId'] }
]

export function SidebarPanel({
  placeholders,
  versions,
  selectedVersionId,
  editorInstance,
  onInsertPlaceholder,
  onSelectVersion,
  onCreateVersion
}: SidebarPanelProps) {
  return (
    <div className="space-y-6">
      {/* Placeholders Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Placeholders</h3>
        </div>

        <ScrollArea className="h-auto max-h-[200px]">
          <div className="space-y-3 pr-3">
            {AVAILABLE_PLACEHOLDERS.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium">
                  {group.category}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => (
                    <Button
                      key={item}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 px-2 text-xs font-mono hover:bg-accent"
                      onClick={() => onInsertPlaceholder(item)}
                      disabled={!editorInstance}
                    >
                      {'{{'}{item}{'}}'}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <hr className="border-border" />

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

        <ScrollArea className="h-auto max-h-[300px]">
          <div className="space-y-1 pr-3">
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No versions yet
              </p>
            ) : (
              versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => onSelectVersion(version)}
                  className={cn(
                    'w-full text-left p-2 rounded-lg border transition-all',
                    'hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring',
                    selectedVersionId === version.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs truncate">
                      v{version.versionNumber}: {version.name}
                    </span>
                    {version.isPublished ? (
                      <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(version.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {version.isPublished && (
                      <Badge variant="default" className="text-[8px] h-3 px-1">
                        LIVE
                      </Badge>
                    )}
                    {!version.isPublished && selectedVersionId === version.id && (
                      <Badge variant="secondary" className="text-[8px] h-3 px-1">
                        EDITING
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Quick Stats */}
      {placeholders.length > 0 && (
        <>
          <hr className="border-border" />
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Template Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <div className="text-lg font-semibold">{placeholders.length}</div>
                <div className="text-[10px] text-muted-foreground">Placeholders</div>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <div className="text-lg font-semibold">{versions.length}</div>
                <div className="text-[10px] text-muted-foreground">Versions</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
