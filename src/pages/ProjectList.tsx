import { useState, useMemo } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockProjects } from "@/data/mockProjects";
import { FolderOpen, AlertCircle, RefreshCw, FolderKanban, PlayCircle, CheckCircle2, Archive } from "lucide-react";

export default function ProjectList() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const [isLoading] = useState(false);
  const [isError] = useState(false);

  // Extract unique creators for filter
  const creators = useMemo(() => {
    const set = new Set(mockProjects.map((p) => p.createdBy));
    return Array.from(set).sort();
  }, []);

  // Stats
  const stats = useMemo(() => ({
    total: mockProjects.length,
    inProgress: mockProjects.filter((p) => p.status === "in_progress").length,
    completed: mockProjects.filter((p) => p.status === "completed").length,
    archived: mockProjects.filter((p) => p.status === "archived").length,
  }), []);

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesPhase =
        phaseFilter === "all" ||
        (phaseFilter === "completed" ? p.status === "completed" : p.phase === phaseFilter);
      const matchesCreator =
        creatorFilter === "all" || p.createdBy === creatorFilter;
      return matchesSearch && matchesPhase && matchesCreator;
    });
  }, [search, phaseFilter, creatorFilter]);

  const statCards = [
    { label: "全部專案", value: stats.total, icon: FolderKanban, color: "text-primary" },
    { label: "進行中", value: stats.inProgress, icon: PlayCircle, color: "text-phase-2" },
    { label: "已完成", value: stats.completed, icon: CheckCircle2, color: "text-success" },
    { label: "已封存", value: stats.archived, icon: Archive, color: "text-muted-foreground" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">專案列表</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理您的概念設計專案，追蹤進度與決策。
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg bg-muted p-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <ProjectFilters
        search={search}
        onSearchChange={setSearch}
        phaseFilter={phaseFilter}
        onPhaseFilterChange={setPhaseFilter}
        creatorFilter={creatorFilter}
        onCreatorFilterChange={setCreatorFilter}
        creators={creators}
        onCreateProject={() => setCreateOpen(true)}
      />

      {/* Results count */}
      {!isLoading && !isError && filteredProjects.length > 0 && (
        <p className="text-xs text-muted-foreground">
          顯示 {filteredProjects.length} 個專案
          {(search || phaseFilter !== "all" || creatorFilter !== "all") && (
            <span>（共 {mockProjects.length} 個）</span>
          )}
        </p>
      )}

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
            {search || phaseFilter !== "all" || creatorFilter !== "all"
              ? "找不到符合條件的專案"
              : "尚無專案"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search || phaseFilter !== "all" || creatorFilter !== "all"
              ? "嘗試調整搜尋或篩選條件。"
              : "建立你的第一個專案，開始概念設計旅程。"}
          </p>
          {!search && phaseFilter === "all" && creatorFilter === "all" && (
            <Button onClick={() => setCreateOpen(true)}>新增專案</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}