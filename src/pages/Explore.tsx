import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SocraticTab } from "@/components/explore/SocraticTab";
import { ContradictionTab } from "@/components/explore/ContradictionTab";
import { CldTab } from "@/components/explore/CldTab";
import { ExploreGates } from "@/components/explore/ExploreGates";
import {
  useSocraticQuestions,
  useUpdateSocraticQuestion,
  useCreateSocraticQuestion,
  useExploreContradictions,
  useCldNodes,
  useCldEdges,
} from "@/hooks/api/useExplore";
import { useBrief, useConstraints, useKpis } from "@/hooks/api/useBrief";
import { useTrackAssumptions } from "@/hooks/api/useTrack";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/api/useQueryConfig";
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

  // --- API hooks ---
  const { data: questions = [], isLoading: isLoadingQuestions } = useSocraticQuestions(id);
  const { data: contradictions = [], isLoading: isLoadingContradictions } = useExploreContradictions(id);
  const { data: cldNodes = [], isLoading: isLoadingNodes } = useCldNodes(id);
  const { data: cldEdges = [], isLoading: isLoadingEdges } = useCldEdges(id);
  const updateQuestion = useUpdateSocraticQuestion();
  const createQuestion = useCreateSocraticQuestion();

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
    () => contradictions.map((c) => c.naturalDescription || c.engineeringStatement || ''),
    [contradictions],
  );
  const assumptionStrings = useMemo(
    () => trackAssumptions.map((a) => a.description),
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
        original.taggedAsContradiction !== q.taggedAsContradiction;
      if (changed) {
        updateQuestion.mutate({
          id: q.id,
          projectId: id || '',
          answer: q.answer,
          taggedAsAssumption: q.taggedAsAssumption,
          taggedAsContradiction: q.taggedAsContradiction,
        });

        // When a question is newly tagged as contradiction → create entry in contradictions table
        if (q.taggedAsContradiction && !original.taggedAsContradiction && id) {
          const desc = `[${q.category}] ${q.text}${q.answer ? ` — ${q.answer}` : ''}`;
          const now = new Date().toISOString();
          supabase
            .from('contradictions')
            .insert({
              project_id: id,
              natural_description: desc,
              severity: 'medium',
              created_at: now,
              updated_at: now,
            })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.contradictions.byProject(id) });
            });
        }
      }
    }
  }, [questions, updateQuestion, createQuestion, id, queryClient]);

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
  const gate12Items: GateCheckItem[] = useMemo(() => [
    { label: '累計 ≥ 10 個回答（含 ≥ 10 假設已辨識）', current: answeredCount, target: 10, passed: answeredCount >= 10 },
    { label: '識別 ≥ 3 個已確認矛盾', current: confirmedContradictions, target: 3, passed: confirmedContradictions >= 3 },
    { label: '7 類問題皆有回答', current: new Set(questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)).size, target: 7, passed: new Set(questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)).size >= 7 },
  ], [answeredCount, confirmedContradictions, questions]);

  // Phase Gate 1 check
  const allContradictionsClassified = contradictions.length > 0 && contradictions.every((c) => c.type === 'TC' || c.type === 'PC');
  const phaseGate1Items: GateCheckItem[] = useMemo(() => [
    { label: '至少 1 個因果迴路圖已建立', current: causalLoop ? 1 : 0, target: 1, passed: !!causalLoop },
    { label: '至少 3 個斷路點已標記', current: breakpointsCount, target: 3, passed: breakpointsCount >= 3 },
    { label: '所有矛盾已分類為 TC 或 PC', current: allContradictionsClassified ? contradictions.length : 0, target: Math.max(contradictions.length, 1), passed: allContradictionsClassified && contradictions.length > 0 },
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
                  <Check className="h-3 w-3 text-[#28a745]" />
                  Saved
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#3B82F6]" />
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
          <TabsTrigger value="socratic" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-[#3B82F6] rounded-none">
            索克拉底問答
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {answeredCount}/{questions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="contradictions" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-[#3B82F6] rounded-none">
            矛盾識別
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {tcCount} TC + {pcCount} PC
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cld" className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-[#3B82F6] rounded-none">
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
