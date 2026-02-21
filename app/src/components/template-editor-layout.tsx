// ABOUTME: Three-column resizable layout for template editing (Editor 45%, Preview 30%, Tools 25%)
// ABOUTME: Provides responsive fallback to tabs on tablet/mobile devices
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LayoutTemplate, Eye, Sparkles, type LucideIcon } from "lucide-react";

interface TemplateEditorLayoutProps {
  editor: React.ReactNode;
  preview: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

type PanelSize = {
  editor: number;
  preview: number;
  sidebar: number;
};

// Refined proportions: Editor 45%, Preview 30%, Sidebar 25%
// Sidebar needs more room for Placeholders + Versions
const DEFAULT_SIZES: PanelSize = {
  editor: 45,
  preview: 30,
  sidebar: 25,
};

// Minimum sizes to prevent content crunch
const MIN_SIZES = {
  editor: 35,
  preview: 25,
  sidebar: 20,
};

// Maximum sizes to maintain usability
const MAX_SIZES = {
  editor: 60,
  preview: 45,
  sidebar: 35,
};

// Breakpoint for switching to tabs (in pixels)
const TABS_BREAKPOINT = 1024;

// Breakpoint for tablet layout (in pixels)
const TABLET_BREAKPOINT = 768;

interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
}

export function TemplateEditorLayout({
  editor,
  preview,
  sidebar,
  className,
}: TemplateEditorLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [panelSizes, setPanelSizes] = useState(DEFAULT_SIZES);
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle responsive detection
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < TABLET_BREAKPOINT);
      setIsTablet(width >= TABLET_BREAKPOINT && width < TABS_BREAKPOINT);
    };

    // Check on mount
    checkBreakpoint();

    // Add resize listener
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  // Handle panel resize
  const handleLayoutChange = (layout: { [id: string]: number }) => {
    const sizes = Object.values(layout);
    if (sizes.length === 3) {
      setPanelSizes({
        editor: sizes[0],
        preview: sizes[1],
        sidebar: sizes[2],
      });
    }
  };

  // Mobile/Tablet view with tabs
  if (!isMounted || isMobile || isTablet) {
    const tabs: TabConfig[] = [
      { id: "editor", label: "Editor", icon: LayoutTemplate, content: editor },
      { id: "preview", label: "Preview", icon: Eye, content: preview },
      { id: "sidebar", label: "Tools", icon: Sparkles, content: sidebar },
    ];

    return (
      <div className={cn("flex flex-col h-full", className)}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0 h-12">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="w-4 h-4" />
                  <span
                    className={
                      isMobile ? "hidden sm:inline font-medium" : "font-medium"
                    }
                  >
                    {tab.label}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="flex-1 overflow-auto p-4">{tab.content}</div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Desktop view with resizable panels
  return (
    <div className={cn("h-full", className)}>
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[600px] rounded-xl border bg-background shadow-sm"
        onLayoutChanged={handleLayoutChange}
      >
        {/* Editor Panel - 45% default */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.editor}
          minSize={MIN_SIZES.editor}
          maxSize={MAX_SIZES.editor}
          className="min-w-[420px]"
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <LayoutTemplate className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Editor
                </span>
                <span className="text-xs text-muted-foreground">
                  Content & Settings
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {Math.round(panelSizes.editor)}%
                </span>
              </div>
            </div>
            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-5">
              <div className="max-w-3xl mx-auto">{editor}</div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-border/50 hover:bg-border transition-colors"
        />

        {/* Preview Panel - 30% default */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.preview}
          minSize={MIN_SIZES.preview}
          maxSize={MAX_SIZES.preview}
          className="min-w-[320px]"
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <Eye className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Preview
                </span>
                <span className="text-xs text-muted-foreground">
                  Live Render
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {Math.round(panelSizes.preview)}%
                </span>
              </div>
            </div>
            {/* Panel Content - Subtle background for device frame effect */}
            <div className="flex-1 overflow-auto p-5 bg-gradient-to-br from-muted/20 via-background to-muted/10">
              <div className="h-full flex items-start justify-center">
                {preview}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-border/50 hover:bg-border transition-colors"
        />

        {/* Tools Sidebar - 25% default */}
        <ResizablePanel
          defaultSize={DEFAULT_SIZES.sidebar}
          minSize={MIN_SIZES.sidebar}
          maxSize={MAX_SIZES.sidebar}
          className="min-w-[280px]"
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Tools
                </span>
                <span className="text-xs text-muted-foreground">
                  Placeholders & Versions
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {Math.round(panelSizes.sidebar)}%
                </span>
              </div>
            </div>
            {/* Panel Content */}
            <div className="flex-1 overflow-auto">{sidebar}</div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export type { PanelSize };
