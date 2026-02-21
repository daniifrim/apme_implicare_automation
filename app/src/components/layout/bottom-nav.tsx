"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Submissions", href: "/submissions", icon: Inbox },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100",
        "pb-[env(safe-area-inset-bottom,0px)]",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.02)]",
        "lg:hidden",
        className
      )}
    >
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 pt-3 pb-4 flex flex-col items-center justify-center gap-1.5",
                "active:scale-95 transition-all duration-150",
                isActive
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6",
                  isActive ? "stroke-[2.5px]" : "stroke-2"
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  isActive ? "font-bold" : "font-semibold"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
