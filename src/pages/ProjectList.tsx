import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/data/mockProjects";
import type { ProjectStatus } from "@/types/project";
import { FolderOpen, AlertCircle, RefreshCw } from "lucide-react";

export default function ProjectList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  // Simulate loading / error states — set to false for normal use
  const [isLoading] = useState(false);
  const [isError] = useState(false);

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      const matchesSearch =
        !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">專案列表</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理您的概念設計專案，追蹤進度與決策。
        </p>
      </div>

      {/* Filters */}
      <ProjectFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreateProject={() => navigate("/projects/create")}
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-6">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold">載入失敗</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            無法取得專案列表，請稍後再試。
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重試
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">
            {search || statusFilter !== "all" ? "找不到符合條件的專案" : "尚無專案"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search || statusFilter !== "all"
              ? "嘗試調整搜尋或篩選條件。"
              : "點擊「新增專案」開始您的第一個概念設計。"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => navigate("/projects/create")}>新增專案</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
