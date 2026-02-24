import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FolderKanban, BookOpen, Settings, LayoutDashboard } from "lucide-react";

const navItems = [
  { label: "專案列表", path: "/projects", icon: FolderKanban },
  { label: "知識庫", path: "/knowledge-base", icon: BookOpen },
  { label: "設定", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sidebar-border">
        <LayoutDashboard className="h-6 w-6 text-sidebar-primary" />
        <span className="font-bold text-base text-sidebar-foreground">
          RD Design Copilot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
