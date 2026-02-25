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

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  phaseFilter: string;
  onPhaseFilterChange: (value: string) => void;
  onCreateProject: () => void;
}

export function ProjectFilters({
  search,
  onSearchChange,
  phaseFilter,
  onPhaseFilterChange,
  onCreateProject,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜尋專案..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Select
          value={phaseFilter}
          onValueChange={onPhaseFilterChange}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="所有階段" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="Phase I">Phase 1</SelectItem>
            <SelectItem value="Phase II">Phase 2</SelectItem>
            <SelectItem value="Phase III">Phase 3</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
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
