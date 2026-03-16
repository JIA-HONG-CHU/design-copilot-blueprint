import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Lock, Star } from "lucide-react";
import {
  classifyHardConstraints,
} from "@/lib/constraintLabeling";
import {
  CONSTRAINT_LABEL_ASSET_TYPE,
  HARD_CONSTRAINT_LABEL_TITLE,
  useConstraintLabelMap,
  useCreateConstraintLabelMap,
  useUpdateConstraintLabelMap,
} from "@/hooks/api/useKnowledge";

interface MissionSummaryCardProps {
  projectId?: string;
  mission?: string;
  hardConstraints?: string | string[];
  softObjectives?: string | string[];
}

function normalizeToBulletItems(content?: string | string[]): string[] {
  if (!content) return [];

  const rawItems = Array.isArray(content) ? content : [content];

  return rawItems
    .flatMap((item) =>
      item
        .split(/[；;。]/)
        .flatMap((segment) => segment.split("、"))
        .map((part) => part.trim()),
    )
    .filter(Boolean);
}

export function MissionSummaryCard({ projectId, mission, hardConstraints, softObjectives }: MissionSummaryCardProps) {
  const hardConstraintItems = normalizeToBulletItems(hardConstraints);
  const softObjectiveItems = normalizeToBulletItems(softObjectives);
  const [constraintLabelMap, setConstraintLabelMap] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { entryId, labelMap: dbLabelMap, isLoading: isLabelMapLoading } = useConstraintLabelMap(projectId);
  const createLabelMap = useCreateConstraintLabelMap(projectId);
  const updateLabelMap = useUpdateConstraintLabelMap(projectId);

  useEffect(() => {
    if (!projectId) {
      setInitialized(true);
      return;
    }
    if (isLabelMapLoading) return;
    setConstraintLabelMap(dbLabelMap);
    setInitialized(true);
  }, [projectId, isLabelMapLoading, dbLabelMap]);

  const hardConstraintClassifyResult = useMemo(
    () => classifyHardConstraints(hardConstraintItems, constraintLabelMap),
    [hardConstraintItems, constraintLabelMap],
  );

  useEffect(() => {
    if (!initialized || !hardConstraintClassifyResult.hasUpdates) return;

    setConstraintLabelMap(hardConstraintClassifyResult.nextLabelMap);

    if (!projectId) return;
    const serialized = JSON.stringify(hardConstraintClassifyResult.nextLabelMap);

    if (entryId) {
      if (updateLabelMap.isPending) return;
      updateLabelMap.mutate({ id: entryId, content: serialized });
      return;
    }

    if (createLabelMap.isPending) return;
    createLabelMap.mutate({
      project_id: projectId,
      asset_type: CONSTRAINT_LABEL_ASSET_TYPE,
      title: HARD_CONSTRAINT_LABEL_TITLE,
      content: serialized,
      reviewed: true,
    });
  }, [
    initialized,
    hardConstraintClassifyResult,
    projectId,
    entryId,
    createLabelMap,
    updateLabelMap,
  ]);

  const hardConstraintGroups = hardConstraintClassifyResult.groups;

  if (!mission && hardConstraintItems.length === 0 && softObjectiveItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">任務摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mission && (
          <div className="flex gap-2">
            <Target className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Mission</div>
              <p className="text-sm leading-relaxed">{mission}</p>
            </div>
          </div>
        )}
        {hardConstraintItems.length > 0 && (
          <div className="flex gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Hard Constraints</div>
              <div className="space-y-2">
                {hardConstraintGroups.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <p className="text-xs font-medium text-foreground/80">{group.label}</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                      {group.items.map((item, index) => (
                        <li key={`${group.label}-${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {softObjectiveItems.length > 0 && (
          <div className="flex gap-2">
            <Star className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-0.5">Soft Objectives</div>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                {softObjectiveItems.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
