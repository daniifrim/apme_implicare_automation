"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { UnsavedChangesProvider } from "@/hooks/use-unsaved-changes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: {
    parent: string;
    current: string;
  };
}

export function AppShell({ children, breadcrumb }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <UnsavedChangesProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar - hidden on mobile */}
        <Sidebar />

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mobile />
          </SheetContent>
        </Sheet>

        <main className="flex-1 flex flex-col md:ml-64">
          <Header 
            breadcrumb={breadcrumb} 
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
          <div className="flex-1 p-4 md:p-8">{children}</div>
        </main>
      </div>
    </UnsavedChangesProvider>
  );
}
