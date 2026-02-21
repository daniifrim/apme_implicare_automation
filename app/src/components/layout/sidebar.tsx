"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  GitBranch,
  Webhook,
  History,
  Users,
  Paintbrush,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { name: "Submissions", href: "/submissions", icon: Inbox },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Field Mappings", href: "/mappings", icon: GitBranch },
  { name: "Webhooks", href: "/webhooks", icon: Webhook },
];

const systemNavigation = [
  { name: "Audit Log", href: "/audit", icon: History },
  { name: "Users", href: "/users", icon: Users },
  { name: "UI Lab", href: "/styleguide", icon: Paintbrush },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: "desktop" | "mobile";
}

function SidebarContent({
  isCollapsed = false,
  onToggleCollapse,
  variant = "desktop",
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  const NavItem = ({
    item,
  }: {
    item: { name: string; href: string; icon: React.ElementType };
  }) => {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-custom transition-colors min-h-[44px]",
          isActive
            ? "bg-accent text-primary font-semibold"
            : "hover:bg-muted text-muted-foreground",
          isCollapsed && "justify-center px-2",
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="text-sm">{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3",
          isCollapsed ? "p-4 justify-center" : "p-6",
        )}
      >
        <img
          src="/logo.png"
          alt="APME Logo"
          className="w-9 h-9 rounded-lg object-contain bg-white flex-shrink-0"
        />
        {!isCollapsed && (
          <h1 className="font-bold text-lg tracking-tight truncate">
            APME <span className="text-primary">Implicare</span>
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1", isCollapsed ? "px-2" : "px-4", "space-y-1")}>
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}

        {!isCollapsed && (
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            System
          </div>
        )}

        {isCollapsed && <div className="pt-4 pb-2" />}

        {systemNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Collapse Toggle (desktop only) */}
      {variant === "desktop" && onToggleCollapse && (
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn("w-full gap-2", isCollapsed && "justify-center px-2")}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}

    </>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  variant = "desktop",
}: SidebarProps) {
  // Mobile drawer using custom overlay
  if (variant === "mobile") {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Slide-out drawer from RIGHT */}
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-72 max-w-[85vw] z-50 bg-card border-l border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
            isOpen ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Close button header */}
          <div className="flex items-center justify-end p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <SidebarContent variant="mobile" />
        </div>
      </>
    );
  }

  // Desktop sidebar with collapsible support
  return (
    <aside
      className={cn(
        "border-r border-border flex flex-col fixed inset-y-0 z-40 bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        variant="desktop"
      />
    </aside>
  );
}

export { navigation, systemNavigation };
