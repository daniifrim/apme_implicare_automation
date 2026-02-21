import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  breadcrumb?: {
    parent: string;
    current: string;
  };
  onMenuClick?: () => void;
}

export function Header({ breadcrumb, onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 bg-background z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb / Title */}
        {breadcrumb ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden sm:inline">{breadcrumb.parent}</span>
            <span className="text-muted-foreground/50 hidden sm:inline">/</span>
            <span className="font-semibold">{breadcrumb.current}</span>
          </div>
        ) : (
          <span className="font-semibold">Dashboard</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search components..."
            className="pl-10 pr-4 py-2 w-64"
          />
        </div>
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
