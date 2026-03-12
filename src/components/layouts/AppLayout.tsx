import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
        <footer className="hidden md:flex items-center justify-center border-t border-border px-6 py-2.5 text-[11px] text-muted-foreground shrink-0">
          <span>RD Design Copilot v1.1 · © 2026</span>
        </footer>
      </div>
    </div>
  );
}