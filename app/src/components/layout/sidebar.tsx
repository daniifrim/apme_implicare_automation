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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border flex flex-col fixed inset-y-0 z-40 bg-card">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="APME Logo"
          className="w-9 h-9 rounded-lg object-contain bg-white"
        />
        <h1 className="font-bold text-lg tracking-tight">
          APME <span className="text-primary">Implicare</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-custom transition-colors",
                isActive
                  ? "bg-accent text-primary font-semibold"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-4 pb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          System
        </div>

        {systemNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-custom transition-colors",
                isActive
                  ? "bg-accent text-primary font-semibold"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 p-2 rounded-custom hover:bg-muted transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">Jane Doe</div>
            <div className="text-xs text-muted-foreground truncate">
              admin@apme.ro
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
