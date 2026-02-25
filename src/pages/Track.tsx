import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard } from "@/components/track/KanbanBoard";
import { UnknownFactors } from "@/components/track/UnknownFactors";
import { TrackGate } from "@/components/track/TrackGate";
import { mockTrackAssumptions, mockUnknownFactors } from "@/data/mockTrack";
import type { TrackAssumption, UnknownFactor, TrackGateItem } from "@/types/track";
import { ArrowLeft, Check } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";

type TabKey = 'kanban' | 'unknown';

export default function Track() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const hashTab = location.hash.replace('#', '') as TabKey;
  const initialTab: TabKey = ['kanban', 'unknown'].includes(hashTab) ? hashTab : 'kanban';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [assumptions, setAssumptions] = useState<TrackAssumption[]>([]);
  const [factors, setFactors] = useState<UnknownFactor[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (id) {
        setAssumptions(mockTrackAssumptions[id] ?? []);
        setFactors(mockUnknownFactors[id] ?? []);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [id]);

  const handleTabChange = useCallback((tab: string) => {
    const t = tab as TabKey;
    setActiveTab(t);
    window.history.replaceState(null, '', `#${t}`);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, []);

  const handleConvertToAssumption = useCallback((factor: UnknownFactor) => {
    const code = `A-${String(assumptions.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newA: TrackAssumption = {
      id: `ta-${Date.now()}`,
      assumptionCode: code,
      description: factor.description,
      riskLevel: factor.impact === 'high' ? 'H' : factor.impact === 'medium' ? 'M' : 'L',
      verificationStatus: 'unverified',
      experimentCount: 0,
      source: 'unknown_convert',
      linkedContradictionId: null,
      aiChallenge: null,
      createdAt: now,
      updatedAt: now,
    };
    setAssumptions((prev) => [...prev, newA]);
  }, [assumptions.length]);

  // Gate 2.1 checks
  const totalAssumptions = assumptions.length;
  const beyondUnverified = assumptions.filter((a) => a.verificationStatus !== 'unverified').length;
  const highRiskAssumptions = assumptions.filter((a) => a.riskLevel === 'H' || a.riskLevel === 'H*');
  const highRiskWithExp = highRiskAssumptions.filter((a) => a.experimentCount > 0).length;

  const gateItems: TrackGateItem[] = useMemo(() => [
    { label: '至少 5 個假設已建立', current: totalAssumptions, target: 5, passed: totalAssumptions >= 5 },
    { label: '至少 1 個假設處於「驗證中」或以上', current: beyondUnverified, target: 1, passed: beyondUnverified >= 1 },
    { label: '所有高風險 (H*/H) 假設皆有實驗計畫', current: highRiskWithExp, target: Math.max(highRiskAssumptions.length, 1), passed: highRiskAssumptions.length > 0 && highRiskWithExp === highRiskAssumptions.length },
  ], [totalAssumptions, beyondUnverified, highRiskWithExp, highRiskAssumptions.length]);

  const openFactors = factors.filter((f) => f.status === 'open').length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 flex-1" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
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
          <div className="h-8 w-1 rounded-full bg-[#F59E0B]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Track — 假設追蹤
              <HelpTooltip text="此階段管理所有設計假設，透過 Kanban 看板追蹤驗證進度。高風險假設必須有實驗計畫，通過 Gate 2.1 後進入方案創造。" className="ml-2 align-middle" />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Step 2.1 · 假設 Kanban + 未知集合 U
            </p>
          </div>
        </div>
      </div>

      {/* Purpose intro */}
      <SectionIntro text="將設計假設拖曳到對應的驗證階段（未驗證 → 驗證中 → 已驗證/已推翻）。「未知集合 U」收集尚未歸類的不確定因素，可一鍵轉為假設進行追蹤。" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-2 h-11">
          <TabsTrigger
            value="kanban"
            className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-[#F59E0B] rounded-none"
          >
            假設 Kanban
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {assumptions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="unknown"
            className="text-xs sm:text-sm data-[state=active]:border-b-[3px] data-[state=active]:border-b-[#F59E0B] rounded-none"
          >
            未知集合 U
            <Badge variant="secondary" className="text-[10px] ml-1.5 hidden sm:inline-flex">
              {openFactors}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-5">
          <KanbanBoard
            assumptions={assumptions}
            onUpdateAssumptions={setAssumptions}
            projectId={id || ''}
          />
        </TabsContent>

        <TabsContent value="unknown" className="mt-5">
          <UnknownFactors
            factors={factors}
            onUpdateFactors={setFactors}
            onConvertToAssumption={handleConvertToAssumption}
            projectId={id || ''}
          />
        </TabsContent>
      </Tabs>

      {/* Gate */}
      <TrackGate
        items={gateItems}
        onNavigateNext={() => navigate(`/projects/${id}/create`)}
      />
    </div>
  );
}
