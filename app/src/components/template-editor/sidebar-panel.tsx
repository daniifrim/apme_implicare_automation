// ABOUTME: Enhanced sidebar panel with placeholders, version history, template metadata, and actions
// ABOUTME: Optimized for 280px+ width with responsive grid layouts and collapsible sections
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
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
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
  { category: 'Contact', items: ['FirstName', 'LastName', 'Email'] },
  { category: 'Mission', items: ['Missionary', 'EthnicGroup', 'Location'] },
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
  const [expandedSections, setExpandedSections] = useState({
    placeholders: true,
    versions: true,
    stats: true
  })

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
    <div className="h-full flex flex-col">
      {/* Template Info Header */}
      {(templateName || templateSlug) && (
        <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {templateName && (
                <h2 className="text-sm font-semibold truncate leading-tight">
                  {templateName}
                </h2>
              )}
              {templateSlug && (
                <code className="text-[10px] text-muted-foreground font-mono truncate block">
                  {templateSlug}
                </code>
              )}
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Placeholders Section */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('placeholders')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold">Placeholders</h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {placeholders.length} used
                </Badge>
              </div>
              {expandedSections.placeholders ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expandedSections.placeholders && (
              <div className="space-y-2 pl-8">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter placeholders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                {/* Placeholders Grid - 2 columns with wider sidebar */}
                <div className="space-y-2">
                  {filteredPlaceholders.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No placeholders found</p>
                  ) : (
                    filteredPlaceholders.map((group) => (
                      <div key={group.category} className="space-y-1">
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
                                  "w-full justify-between h-7 px-2.5 text-xs font-mono group/btn",
                                  isUsed
                                    ? "bg-blue-50/70 text-blue-700 hover:bg-blue-50 border border-blue-100"
                                    : "hover:bg-accent border border-transparent"
                                )}
                                onClick={() => onInsertPlaceholder(item)}
                                disabled={!editorInstance}
                                title={isUsed ? 'Used in template - click to insert again' : 'Click to insert'}
                              >
                                <span className="truncate">{'{{'}{item}{'}}'}</span>
                                {isUsed && (
                                  <Badge variant="outline" className="h-4 text-[8px] px-1 bg-blue-100 border-blue-200 shrink-0">
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
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Version History Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleSection('versions')}
                className="flex items-center gap-2 group flex-1"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/10">
                  <History className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold">Versions</h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {versions.length}
                </Badge>
                {expandedSections.versions ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                )}
              </button>
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

            {expandedSections.versions && (
              <div className="pl-8 space-y-1.5">
                {versions.length === 0 ? (
                  <div className="text-center py-4 px-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">No versions yet</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={onCreateVersion}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Create first version
                    </Button>
                  </div>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className={cn(
                        'group relative rounded-lg border transition-all overflow-hidden',
                        selectedVersionId === version.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent hover:border-border bg-muted/30 hover:bg-muted/50'
                      )}
                    >
                      <button
                        onClick={() => onSelectVersion(version)}
                        className="w-full text-left p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-xs truncate">
                            v{version.versionNumber}: {version.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {version.isPublished ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(version.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {version.isPublished ? (
                            <Badge className="text-[8px] h-4 px-1.5 bg-green-600 hover:bg-green-600">
                              LIVE
                            </Badge>
                          ) : selectedVersionId === version.id ? (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-primary/50 text-primary">
                              EDITING
                            </Badge>
                          ) : null}
                        </div>
                      </button>

                      {/* Version Actions */}
                      {selectedVersionId === version.id && !version.isPublished && (
                        <div className="flex items-center gap-1 px-2.5 pb-2">
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
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Quick Stats Section */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('stats')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold">Quick Stats</h3>
              </div>
              {expandedSections.stats ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expandedSections.stats && (
              <div className="pl-8">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted to-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span className="text-lg font-semibold">{placeholders.length}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Placeholders</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted to-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3 h-3 text-purple-500" />
                      <span className="text-lg font-semibold">{versions.length}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Versions</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted to-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-lg font-semibold">
                        {publishedVersion ? `v${publishedVersion.versionNumber}` : '-'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Published</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-muted to-muted/50 border">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span className="text-lg font-semibold">
                        {selectedVersion ? selectedVersion.subject.length : 0}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Subject chars</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
