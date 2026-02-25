import { useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  FolderKanban, BookOpen, Settings, LayoutDashboard, Menu,
  ClipboardList, Compass, ListChecks, Wand2, Search, Gavel,
} from "lucide-react";

const navItems = [
  { label: "專案列表", path: "/projects", icon: FolderKanban },
  { label: "知識庫", path: "/knowledge-base", icon: BookOpen },
  { label: "設定", path: "/settings", icon: Settings },
];

const projectSteps = [
  { id: "brief", label: "Brief", zhLabel: "定義簡報", icon: ClipboardList, route: "brief", phase: 1 },
  { id: "explore", label: "Explore", zhLabel: "問題探索", icon: Compass, route: "explore", phase: 1 },
  { id: "track", label: "Track", zhLabel: "假設追蹤", icon: ListChecks, route: "track", phase: 2 },
  { id: "create", label: "Create", zhLabel: "方案創造", icon: Wand2, route: "create", phase: 2 },
  { id: "review", label: "Review", zhLabel: "設計審查", icon: Search, route: "review", phase: 3 },
  { id: "decide", label: "Decide", zhLabel: "最終決策", icon: Gavel, route: "decide", phase: 3 },
];

const phaseColors: Record<number, string> = { 1: "text-[hsl(217,91%,60%)]", 2: "text-[hsl(38,92%,50%)]", 3: "text-[hsl(160,64%,43%)]" };

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { id: projectId } = useParams();

  const isInsideProject = !!projectId && location.pathname.startsWith(`/projects/${projectId}`);

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
          <nav className="px-3 py-4 space-y-1 overflow-y-auto">
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

            {isInsideProject && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">專案流程</p>
                </div>
                <NavLink to={`/projects/${projectId}`} end onClick={() => setOpen(false)}
                  className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === `/projects/${projectId}` ? "bg-accent/10 text-primary" : "text-foreground hover:bg-muted"
                  )}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </NavLink>
                {[1, 2, 3].map(phase => (
                  <div key={phase}>
                    <p className={cn("text-[10px] font-medium px-3 pt-2", phaseColors[phase])}>
                      Phase {phase}
                    </p>
                    {projectSteps.filter(s => s.phase === phase).map(step => {
                      const fullPath = `/projects/${projectId}/${step.route}`;
                      const isActive = location.pathname === fullPath || location.pathname.startsWith(fullPath + "/");
                      return (
                        <NavLink key={step.id} to={fullPath} onClick={() => setOpen(false)}
                          className={cn("flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ml-2",
                            isActive ? "bg-accent/10 text-primary" : "text-foreground hover:bg-muted"
                          )}>
                          <step.icon className="h-3.5 w-3.5" />
                          {step.label} <span className="text-muted-foreground ml-auto">{step.zhLabel}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
