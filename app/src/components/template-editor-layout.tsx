// ABOUTME: Three-column resizable layout for template editing (Editor 60%, Preview 25%, Sidebar 15%)
// ABOUTME: Provides responsive fallback to tabs on tablet/mobile devices
'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable'
import { LayoutTemplate, Eye, Settings, type LucideIcon } from 'lucide-react'

interface TemplateEditorLayoutProps {
  editor: React.ReactNode
  preview: React.ReactNode
  sidebar: React.ReactNode
  className?: string
}

type PanelSize = {
  editor: number
  preview: number
  sidebar: number
}

// Default sizes based on percentage (60%, 25%, 15%)
const DEFAULT_SIZES: PanelSize = {
  editor: 60,
  preview: 25,
  sidebar: 15
}

// Breakpoint for switching to tabs (in pixels)
const TABS_BREAKPOINT = 1024

// Breakpoint for tablet layout (in pixels)
const TABLET_BREAKPOINT = 768

interface TabConfig {
  id: string
  label: string
  icon: LucideIcon
  content: React.ReactNode
}

export function TemplateEditorLayout({
  editor,
  preview,
  sidebar,
  className
}: TemplateEditorLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')
  const [panelSizes, setPanelSizes] = useState(DEFAULT_SIZES)

  // Handle responsive detection
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth
      setIsMobile(width < TABLET_BREAKPOINT)
      setIsTablet(width >= TABLET_BREAKPOINT && width < TABS_BREAKPOINT)
    }

    // Check on mount
    checkBreakpoint()

    // Add resize listener
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  // Handle panel resize
  const handleLayoutChange = (layout: { [key: string]: number }) => {
    const sizes = Object.values(layout)
    if (sizes.length === 3) {
      setPanelSizes({
        editor: sizes[0],
        preview: sizes[1],
        sidebar: sizes[2]
      })
    }
  }

  // Mobile/Tablet view with tabs
  if (isMobile || isTablet) {
    const tabs: TabConfig[] = [
      { id: 'editor', label: 'Editor', icon: LayoutTemplate, content: editor },
      { id: 'preview', label: 'Preview', icon: Eye, content: preview },
      { id: 'sidebar', label: 'Tools', icon: Settings, content: sidebar }
    ]

    return (
      <div className={cn('flex flex-col h-full', className)}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className={isMobile ? 'hidden sm:inline' : ''}>{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 min-h-0 mt-4 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="flex-1 overflow-auto">{tab.content}</div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  // Desktop view with resizable panels
  return (
    <div className={cn('h-full', className)}>
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[600px] rounded-lg border"
        onLayoutChange={handleLayoutChange}
      >
        {/* Editor Panel - 60% */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.editor}
          minSize={40}
          maxSize={75}
          className="min-w-[400px]"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Editor</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {Math.round(panelSizes.editor)}%
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">{editor}</div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview Panel - 25% */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.preview}
          minSize={20}
          maxSize={40}
          className="min-w-[250px]"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Preview</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {Math.round(panelSizes.preview)}%
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted/30">{preview}</div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Sidebar Panel - 15% */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.sidebar}
          minSize={12}
          maxSize={25}
          className="min-w-[180px]"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Tools</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {Math.round(panelSizes.sidebar)}%
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">{sidebar}</div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export type { PanelSize }
