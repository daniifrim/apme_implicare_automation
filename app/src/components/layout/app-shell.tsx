"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { UnsavedChangesProvider } from "@/hooks/use-unsaved-changes";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <UnsavedChangesProvider>
      <div className="flex min-h-screen bg-background">
        {/* Mobile Sidebar (Drawer) */}
        <Sidebar
          variant="mobile"
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            variant="desktop"
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <main
          className={`
            flex-1 flex flex-col w-full min-w-0 min-h-screen
            transition-all duration-300
            lg:ml-0
            ${isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}
          `}
        >
          {/* 
            pt-4 adds padding at top since header is removed
            pb-24 provides space for bottom nav on mobile
            lg:pb-8 removes extra padding on desktop
          */}
          <div className="flex-1 pt-4 p-4 pb-24 md:pt-6 md:p-6 md:pb-24 lg:pt-8 lg:p-8 min-w-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </UnsavedChangesProvider>
  );
}
