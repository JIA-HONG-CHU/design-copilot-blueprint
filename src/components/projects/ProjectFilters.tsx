import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import type { ProjectStatus } from "@/types/project";

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ProjectStatus | "all";
  onStatusFilterChange: (value: ProjectStatus | "all") => void;
  onCreateProject: () => void;
}

export function ProjectFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateProject,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜尋專案名稱..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            maxLength={50}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as ProjectStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="所有狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="in_progress">進行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="archived">已封存</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onCreateProject} className="shrink-0">
        <Plus className="h-4 w-4" />
        新增專案
      </Button>
    </div>
  );
}
