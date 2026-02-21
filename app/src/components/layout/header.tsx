import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({
  onMenuClick,
  showMenuButton = false,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 bg-background z-30">
      {/* Left: Logo and Title (mobile only) */}
      <div className="flex items-center gap-3 lg:hidden">
        <img
          src="/logo.png"
          alt="APME Logo"
          className="w-9 h-9 rounded-lg object-contain bg-white flex-shrink-0"
        />
        <h1 className="font-bold text-lg tracking-tight truncate">
          APME <span className="text-primary">Implicare</span>
        </h1>
      </div>

      {/* Left: Empty on desktop (sidebar has logo) */}
      <div className="hidden lg:block" />

      {/* Right: Hamburger Menu Only */}
      <div className="flex items-center">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-10 w-10 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
