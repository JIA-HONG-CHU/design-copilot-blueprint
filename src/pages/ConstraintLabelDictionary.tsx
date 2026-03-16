import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConstraints } from "@/hooks/api/useBrief";
import {
  buildConstraintLabelPayload,
  CONSTRAINT_LABEL_ASSET_TYPE,
  HARD_CONSTRAINT_LABEL_TITLE,
  useConstraintLabelMap,
  useCreateConstraintLabelMap,
  useUpdateConstraintLabelMap,
} from "@/hooks/api/useKnowledge";
import {
  classifyHardConstraints,
  CONSTRAINT_LABEL_CLASSIFIER_VERSION,
  getConstraintLabelSuggestions,
  splitConstraintItems,
} from "@/lib/constraintLabeling";

export default function ConstraintLabelDictionary() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: constraints, isLoading: constraintsLoading } = useConstraints(projectId);
  const {
    entryId,
    labelMap: dbLabelMap,
    classifierVersion,
    schemaVersion,
    isLegacyPayload,
    isLoading: labelMapLoading,
  } = useConstraintLabelMap(projectId);
  const createLabelMap = useCreateConstraintLabelMap(projectId);
  const updateLabelMap = useUpdateConstraintLabelMap(projectId);

  const [localLabelMap, setLocalLabelMap] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [mergeFromLabel, setMergeFromLabel] = useState("");
  const [mergeToLabel, setMergeToLabel] = useState("");

  useEffect(() => {
    if (!projectId) {
      setInitialized(true);
      return;
    }
    if (labelMapLoading) return;
    setLocalLabelMap(dbLabelMap);
    setInitialized(true);
  }, [projectId, labelMapLoading, dbLabelMap]);

  const hardConstraintItems = useMemo(
    () => splitConstraintItems((constraints ?? []).filter((c) => c.type === "hard").map((c) => c.description)),
    [constraints],
  );

  const classifyResult = useMemo(
    () => classifyHardConstraints(hardConstraintItems, localLabelMap),
    [hardConstraintItems, localLabelMap],
  );

  const labelOptions = useMemo(
    () => getConstraintLabelSuggestions(classifyResult.nextLabelMap),
    [classifyResult.nextLabelMap],
  );

  const persistLabelMap = (nextMap: Record<string, string>, targetClassifierVersion = CONSTRAINT_LABEL_CLASSIFIER_VERSION) => {
    if (!projectId) return;
    const payload = buildConstraintLabelPayload(nextMap, targetClassifierVersion);
    const content = JSON.stringify(payload);

    if (entryId) {
      if (updateLabelMap.isPending) return;
      updateLabelMap.mutate({ id: entryId, content, reviewed: true });
      return;
    }

    if (createLabelMap.isPending) return;
    createLabelMap.mutate({
      project_id: projectId,
      asset_type: CONSTRAINT_LABEL_ASSET_TYPE,
      title: HARD_CONSTRAINT_LABEL_TITLE,
      content,
      reviewed: true,
    });
  };

  useEffect(() => {
    if (!initialized || !classifyResult.hasUpdates) return;
    setLocalLabelMap(classifyResult.nextLabelMap);
    persistLabelMap(classifyResult.nextLabelMap, classifierVersion || CONSTRAINT_LABEL_CLASSIFIER_VERSION);
  }, [initialized, classifyResult, classifierVersion]);

  const handleMergeLabels = () => {
    if (!mergeFromLabel || !mergeToLabel) {
      toast.error("請先選擇來源標籤與目標標籤");
      return;
    }
    if (mergeFromLabel === mergeToLabel) {
      toast.error("來源與目標標籤不能相同");
      return;
    }

    const nextMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(localLabelMap)) {
      nextMap[key] = value === mergeFromLabel ? mergeToLabel : value;
    }

    setLocalLabelMap(nextMap);
    persistLabelMap(nextMap);
    setMergeFromLabel("");
    setMergeToLabel("");
    toast.success(`已將「${mergeFromLabel}」合併至「${mergeToLabel}」`);
  };

  const handleUpgradeVersion = () => {
    persistLabelMap(localLabelMap, CONSTRAINT_LABEL_CLASSIFIER_VERSION);
    toast.success("已升級映射版本至目前分類器版本");
  };

  if (constraintsLoading || labelMapLoading) {
    return (
      <div className="page-shell-wide space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="page-shell-wide space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            回 Dashboard
          </Button>
          <h1 className="text-xl font-semibold">標籤字典</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">映射版本</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">Schema v{schemaVersion}</Badge>
          <Badge variant="outline">Classifier {classifierVersion}</Badge>
          {isLegacyPayload && (
            <Button size="sm" variant="outline" onClick={handleUpgradeVersion}>
              升級至 {CONSTRAINT_LABEL_CLASSIFIER_VERSION}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">合併重複標籤</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Select value={mergeFromLabel} onValueChange={setMergeFromLabel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="來源標籤" />
            </SelectTrigger>
            <SelectContent>
              {labelOptions.map((label) => (
                <SelectItem key={`from-${label}`} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">→</span>
          <Select value={mergeToLabel} onValueChange={setMergeToLabel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="目標標籤" />
            </SelectTrigger>
            <SelectContent>
              {labelOptions.map((label) => (
                <SelectItem key={`to-${label}`} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleMergeLabels}>
            <GitMerge className="mr-1 h-4 w-4" />
            合併
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">目前標籤分佈</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {classifyResult.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">目前沒有 Hard Constraints。</p>
          ) : (
            classifyResult.groups.map((group) => (
              <div key={group.label} className="rounded border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{group.label}</p>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {group.items.slice(0, 6).map((item, index) => (
                    <li key={`${group.label}-${index}`}>{item}</li>
                  ))}
                  {group.items.length > 6 && <li>... 還有 {group.items.length - 6} 項</li>}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
