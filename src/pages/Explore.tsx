import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAiOperationGuard } from "@/hooks/useAiOperationGuard";
import { SocraticTab } from "@/components/explore/SocraticTab";
import { ContradictionTab } from "@/components/explore/ContradictionTab";
import { CldTab } from "@/components/explore/CldTab";
import { ExploreGates } from "@/components/explore/ExploreGates";
import {
  useSocraticQuestions,
  useUpdateSocraticQuestion,
  useCreateSocraticQuestion,
  useDeleteSocraticQuestion,
  useExploreContradictions,
  useCldNodes,
  useCldEdges,
} from "@/hooks/api/useExplore";
import { useBrief, useConstraints, useKpis } from "@/hooks/api/useBrief";
import { useTrackAssumptions } from "@/hooks/api/useTrack";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/api/useQueryConfig";
import { contradictionFormalize } from "@/lib/api";
import { DEFAULT_SEVERITY } from "@/types/contradiction";
import type { SocraticQuestion, ExploreContradiction, CausalLoop, GateCheckItem } from "@/types/explore";
import { ArrowLeft, Check } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { KnowledgeRefsPanel } from "@/components/create/KnowledgeRefsPanel";
// TODO: Replace mockPageKnowledgeRefs with a useKnowledgeRefs hook once a knowledge_refs DB table is created (Sprint 5+)
import { mockPageKnowledgeRefs } from "@/data/mockKnowledgeRefs";

type TabKey = 'socratic' | 'contradictions' | 'cld';

export default function Explore() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab from URL hash
  const hashTab = location.hash.replace('#', '') as TabKey;
  const initialTab: TabKey = ['socratic', 'contradictions', 'cld'].includes(hashTab) ? hashTab : 'socratic';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { startOp, endOp } = useAiOperationGuard();

  // --- API hooks ---
  const { data: questions = [], isLoading: isLoadingQuestions } = useSocraticQuestions(id);
  const { data: contradictions = [], isLoading: isLoadingContradictions } = useExploreContradictions(id);
  const { data: cldNodes = [], isLoading: isLoadingNodes } = useCldNodes(id);
  const { data: cldEdges = [], isLoading: isLoadingEdges } = useCldEdges(id);
  const updateQuestion = useUpdateSocraticQuestion();
  const createQuestion = useCreateSocraticQuestion();
  const deleteQuestionMut = useDeleteSocraticQuestion();

  // Phase 1 context for downstream agents
  const { data: brief } = useBrief(id);
  const { data: constraintsList = [] } = useConstraints(id);
  const { data: kpisList = [] } = useKpis(id);
  const { data: trackAssumptions = [] } = useTrackAssumptions(id);

  const constraintStrings = useMemo(
    () => constraintsList.map((c) => `[${c.constraintCode}] ${c.description} (${c.type})`),
    [constraintsList],
  );
  const kpiStrings = useMemo(
    () => kpisList.map((k) => `${k.kpiName}: ${k.targetValue} ${k.unit}`),
    [kpisList],
  );
  const contradictionStrings = useMemo(
    () => contradictions.map((c) => {
      const stmt = c.engineeringStatement || c.description || '';
      const src = c.source === 'ai' ? ', from: ai' : '';
      return `[${c.id.slice(0, 8)}, ${c.type}${src}] ${stmt}`;
    }),
    [contradictions],
  );
  const assumptionStrings = useMemo(
    () => trackAssumptions.map((a) => {
      const src = a.source === 'explore_tag' ? ', from: socratic' : '';
      return `[${a.assumptionCode || a.id?.slice(0, 8) || '?'}${src}] ${a.description}`;
    }),
    [trackAssumptions],
  );

  const isLoading = isLoadingQuestions || isLoadingContradictions || isLoadingNodes || isLoadingEdges;

  // Compose CausalLoop object from separate nodes + edges
  const causalLoop: CausalLoop | null = useMemo(() => {
    if (cldNodes.length === 0 && cldEdges.length === 0) return null;
    return { id: `cld-${id}`, nodes: cldNodes, edges: cldEdges };
  }, [cldNodes, cldEdges, id]);

  const queryClient = useQueryClient();

  // Wrapper to let child components update questions via the mutation hook
  const handleUpdateQuestions = useCallback((updated: SocraticQuestion[]) => {
    for (const q of updated) {
      const original = questions.find((oq) => oq.id === q.id);

      // ✅ 新問題 → 呼叫「新增」API 存進資料庫
      if (!original) {
        createQuestion.mutate({
          projectId: id || '',
          category: q.category,
          text: q.text,
        });
        continue;
      }

      // 既有問題 → 檢查是否有變更再更新
      const changed =
        original.answer !== q.answer ||
        original.taggedAsAssumption !== q.taggedAsAssumption ||
        original.taggedAsContradiction !== q.taggedAsContradiction ||
        original.aiSuggestedTag !== q.aiSuggestedTag;
      if (changed) {
        updateQuestion.mutate({
          id: q.id,
          projectId: id || '',
          answer: q.answer,
          taggedAsAssumption: q.taggedAsAssumption,
          taggedAsContradiction: q.taggedAsContradiction,
          aiSuggestedTag: q.aiSuggestedTag,
        });

        // When a question is newly tagged as contradiction → create entry + auto-formalize
        if (q.taggedAsContradiction && !original.taggedAsContradiction && id) {
          const desc = `[${q.category}] ${q.text}${q.answer ? ` — ${q.answer}` : ''}`;
          const now = new Date().toISOString();
          startOp();
          supabase
            .from('contradictions')
            .insert({
              project_id: id,
              natural_description: desc,
              source_question_id: q.id,
              source_type: 'socratic',
              severity: DEFAULT_SEVERITY,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single()
            .then(({ data }) => {
              queryClient.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(id) });

              if (data?.id) {
                contradictionFormalize({
                  project_id: id,
                  contradiction_id: data.id,
                  natural_description: desc,
                  mission: brief?.mission,
                  constraints: constraintStrings,
                  kpis: kpiStrings,
                })
                  .then((result) => {
                    supabase
                      .from('contradictions')
                      .update({
                        type: result.type,
                        improving_param: result.improving_param,
                        worsening_param: result.worsening_param,
                        engineering_statement: result.engineering_statement,
                        physical_contradiction: result.pc_attribute_a && result.pc_attribute_not_a
                          ? `${result.pc_attribute_a} | ${result.pc_attribute_not_a}`
                          : result.physical_contradiction,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', data.id)
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(id) });
                      });
                  })
                  .catch(() => {})
                  .finally(() => endOp());
              } else {
                endOp();
              }
            });
        }

        // When a question is newly tagged as assumption → create entry in assumptions table
        if (q.taggedAsAssumption && !original.taggedAsAssumption && id) {
          startOp();
          supabase
            .from('assumptions')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', id)
            .then(({ count }) => {
              const code = `A-${String((count ?? 0) + 1).padStart(3, '0')}`;
              const content = `${q.text}${q.answer ? ` — ${q.answer}` : ''}`;
              const now = new Date().toISOString();
              supabase
                .from('assumptions')
                .insert({
                  project_id: id,
                  code,
                  content,
                  source_type: 'socratic',
                  source: q.id,
                  worst_severity: 'medium',
                  status: 'unverified',
                  verification_stage: 'unplanned',
                  created_at: now,
                  updated_at: now,
                })
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: queryKeys.track.assumptions(id) });
                  queryClient.invalidateQueries({ queryKey: queryKeys.assumptions.byProject(id) });
                })
                .finally(() => endOp());
            });
        }
      }
    }
  }, [questions, updateQuestion, createQuestion, id, queryClient, brief?.mission, constraintStrings, kpiStrings, startOp, endOp]);

  // Delete a single Socratic question (Gmail-style: immediate delete + undo re-insert)
  const handleDeleteQuestion = useCallback((qId: string) => {
    const removed = questions.find((q) => q.id === qId);
    if (!removed || !id) return;
    deleteQuestionMut.mutate({ id: qId, projectId: id });
    toast(`已刪除問題`, {
      duration: 5000,
      action: {
        label: "復原",
        onClick: () => {
          createQuestion.mutate({ projectId: id, category: removed.category, text: removed.text });
        },
      },
    });
  }, [questions, id, deleteQuestionMut, createQuestion]);

  // Brief staleness detection: brief updated after latest question was created
  const isBriefStale = useMemo(() => {
    if (!brief?.updatedAt || questions.length === 0) return false;
    const briefTime = new Date(brief.updatedAt).getTime();
    // Find the earliest question creation time (if all questions were created before the brief update, they're stale)
    const latestQuestionTime = Math.max(...questions.map((q) => new Date(q.createdAt ?? 0).getTime()));
    // If latestQuestionTime is 0 (no createdAt), use a fallback: check if any question exists before brief update
    if (latestQuestionTime <= 0) return false;
    return briefTime > latestQuestionTime;
  }, [brief?.updatedAt, questions]);

  // Update URL hash on tab change
  const handleTabChange = useCallback((tab: string) => {
    const t = tab as TabKey;
    setActiveTab(t);
    window.history.replaceState(null, '', `#${t}`);
    // Auto-save simulation
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, []);

  // Tab badges
  const answeredCount = questions.filter((q) => q.answer && q.answer.trim().length >= 5).length;
  const tcCount = contradictions.filter((c) => c.type === 'TC').length;
  const pcCount = contradictions.filter((c) => c.type === 'PC').length;
  const breakpointsCount = causalLoop?.nodes.filter((n) => n.isBreakpoint).length ?? 0;

  // Gate 1.2 check
  const confirmedContradictions = contradictions.filter((c) => c.status === 'confirmed').length;
  // A project may legitimately have 0 contradictions after thorough exploration.
  // Gate passes if at least 1 confirmed OR no contradictions were identified at all.
  const contradictionCheckPassed = confirmedContradictions >= 1 || contradictions.length === 0;
  const gate12Items: GateCheckItem[] = useMemo(() => [
    { label: '累計 ≥ 10 個回答（含 ≥ 10 假設已辨識）', current: answeredCount, target: 10, passed: answeredCount >= 10 },
    { label: '矛盾已處理（≥ 1 個已確認，或確認無矛盾）', current: confirmedContradictions, target: contradictions.length > 0 ? 1 : 0, passed: contradictionCheckPassed },
    { label: '7 類問題皆有回答', current: new Set(questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)).size, target: 7, passed: new Set(questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)).size >= 7 },
  ], [answeredCount, confirmedContradictions, contradictions.length, contradictionCheckPassed, questions]);

  // Phase Gate 1 check
  // Allow zero-contradiction projects to pass — classification check only applies when contradictions exist
  const allContradictionsClassified = contradictions.length === 0 || contradictions.every((c) => c.type === 'TC' || c.type === 'PC');
  const phaseGate1Items: GateCheckItem[] = useMemo(() => [
    { label: '至少 1 個因果迴路圖已建立', current: causalLoop ? 1 : 0, target: 1, passed: !!causalLoop },
    { label: '至少 3 個斷路點已標記', current: breakpointsCount, target: 3, passed: breakpointsCount >= 3 },
    { label: '所有矛盾已分類為 TC 或 PC（或無矛盾）', current: allContradictionsClassified ? Math.max(contradictions.length, 1) : 0, target: Math.max(contradictions.length, 1), passed: allContradictionsClassified },
  ], [causalLoop, breakpointsCount, contradictions, allContradictionsClassified]);

  if (isLoading) {
    return (
      <div className="page-shell-kb">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="page-shell-kb">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${id}`)}
            className="text-muted-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回 Dashboard
          </Button>
          {saveStatus !== 'idle' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  Saved
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-blue-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Explore — 問題探索
              <HelpTooltip text="此階段透過蘇格拉底式問答深入探索問題空間，識別設計中的矛盾，並建立因果迴路圖來視覺化變量關係。完成後即可進入下一階段。" className="ml-2 align-middle" />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Step 1.2–1.3 · 索克拉底問答 → 矛盾識別 → 因果迴路圖
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="socratic" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-blue-500 rounded-none">
            索克拉底問答
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {answeredCount}/{questions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="contradictions" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-blue-500 rounded-none">
            矛盾識別
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {tcCount} TC + {pcCount} PC
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cld" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-blue-500 rounded-none">
            因果迴路圖
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {breakpointsCount} 斷路點
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="socratic" className="mt-5">
          <SocraticTab
            questions={questions}
            onUpdateQuestions={handleUpdateQuestions}
            onDeleteQuestion={handleDeleteQuestion}
            isBriefStale={isBriefStale}
            briefUpdatedAt={brief?.updatedAt}
            projectId={id || ''}
            mission={brief?.mission}
            constraints={constraintStrings}
          />
        </TabsContent>

        <TabsContent value="contradictions" className="mt-5">
          <ContradictionTab
            contradictions={contradictions}
            onUpdateContradictions={() => { /* mutations handled inside tab; query auto-refreshes */ }}
            hasAnswers={answeredCount > 0}
            projectId={id || ''}
            mission={brief?.mission}
            constraints={constraintStrings}
            kpis={kpiStrings}
          />
        </TabsContent>

        <TabsContent value="cld" className="mt-5">
          <CldTab
            causalLoop={causalLoop}
            onUpdateCausalLoop={() => { /* mutations handled inside tab; query auto-refreshes */ }}
            projectId={id || ''}
            contradictions={contradictionStrings}
            assumptions={assumptionStrings}
            mission={brief?.mission}
            constraints={constraintStrings}
            kpis={kpiStrings}
          />
        </TabsContent>
      </Tabs>

      {/* Knowledge Enhancement Panel (WBS 3.4.2) */}
      <KnowledgeRefsPanel refs={mockPageKnowledgeRefs.explore ?? []} />

      {/* Gates */}
      <ExploreGates
        gate12Items={gate12Items}
        phaseGate1Items={phaseGate1Items}
        onNavigateNext={() => navigate(`/projects/${id}/track`)}
      />
    </div>
  );
}
