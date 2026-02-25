import { NavLink, useLocation, useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban, BookOpen, Settings, LayoutDashboard,
  ClipboardList, Compass, ListChecks, Wand2, Search, Gavel, GraduationCap,
  LogOut, Sun, Moon, Monitor, ChevronDown,
} from "lucide-react";

const globalNavItems = [
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
  { id: "feynman", label: "Feynman", zhLabel: "內化傳達", icon: GraduationCap, route: "feynman", phase: 3 },
];

const phaseColors: Record<number, string> = {
  1: "text-[hsl(217,91%,60%)]",
  2: "text-[hsl(38,92%,50%)]",
  3: "text-[hsl(160,64%,43%)]",
};

const phaseBorderColors: Record<number, string> = {
  1: "border-l-[hsl(217,91%,60%)]",
  2: "border-l-[hsl(38,92%,50%)]",
  3: "border-l-[hsl(160,64%,43%)]",
};

function getStepStatus(pathname: string, route: string, projectId: string): "active" | "completed" | "not_started" {
  const fullPath = `/projects/${projectId}/${route}`;
  if (pathname === fullPath || pathname.startsWith(fullPath + "/")) return "active";
  return "not_started";
}

function StatusDot({ status }: { status: "active" | "completed" | "not_started" }) {
  if (status === "completed") return <span className="text-[10px]">●</span>;
  if (status === "active") return <span className="text-[10px] animate-pulse">◉</span>;
  return <span className="text-[10px] text-muted-foreground">○</span>;
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const isInsideProject = !!projectId && location.pathname.startsWith(`/projects/${projectId}`);

  const initials = user?.user_metadata?.display_name
    ? user.user_metadata.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sidebar-border">
        <LayoutDashboard className="h-6 w-6 text-sidebar-primary" />
        <span className="font-bold text-base text-sidebar-foreground">
          RD Design Copilot
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Global nav */}
        {globalNavItems.map((item) => {
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

        {/* Project-context 6+1 navigation */}
        {isInsideProject && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                專案流程
              </p>
            </div>

            {/* Dashboard link */}
            <NavLink
              to={`/projects/${projectId}`}
              end
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === `/projects/${projectId}`
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>

            {/* 6 steps with phase grouping */}
            {[1, 2, 3].map(phase => (
              <div key={phase} className="space-y-0.5">
                <p className={cn("text-[10px] font-medium px-3 pt-2", phaseColors[phase])}>
                  Phase {phase}: {phase === 1 ? "Define" : phase === 2 ? "Diverge" : "Converge"}
                </p>
                {projectSteps.filter(s => s.phase === phase).map(step => {
                  const status = getStepStatus(location.pathname, step.route, projectId!);
                  const isActive = status === "active";
                  return (
                    <NavLink
                      key={step.id}
                      to={`/projects/${projectId}/${step.route}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors border-l-2 border-l-transparent ml-1",
                        isActive
                          ? cn("bg-sidebar-accent text-sidebar-primary font-medium", phaseBorderColors[phase])
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <StatusDot status={status} />
                      <step.icon className="h-3.5 w-3.5" />
                      <span className="text-xs">{step.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{step.zhLabel}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent transition-colors text-left">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">
                  {user?.user_metadata?.display_name || user?.email || "使用者"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="h-3.5 w-3.5 mr-2" /> 設定
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "dark" : "light")}>
              <ThemeIcon className="h-3.5 w-3.5 mr-2" />
              {theme === "dark" ? "切換至淺色" : theme === "light" ? "切換至深色" : "切換至淺色"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-2" /> 登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
