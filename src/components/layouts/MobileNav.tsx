import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FolderKanban, BookOpen, Settings, LayoutDashboard, Menu } from "lucide-react";

const navItems = [
  { label: "專案列表", path: "/projects", icon: FolderKanban },
  { label: "知識庫", path: "/knowledge-base", icon: BookOpen },
  { label: "設定", path: "/settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <span className="font-bold text-sm">RD Design Copilot</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="font-bold text-base">RD Design Copilot</span>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
