import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, X, Lightbulb, Trash2, AlertTriangle } from "lucide-react";
import type { SocraticQuestion, QuestionCategory } from "@/types/explore";
import { CATEGORY_CONFIG } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";
import { socraticGenerate } from "@/lib/api";

interface SocraticTabProps {
  questions: SocraticQuestion[];
  onUpdateQuestions: (questions: SocraticQuestion[]) => void;
  onDeleteQuestion?: (questionId: string) => void;
  isBriefStale?: boolean;
  projectId: string;
  mission?: string;
  constraints?: string[];
}

const CATEGORY_FILTERS: (QuestionCategory | 'all')[] = ['all', 'clarification', 'assumption', 'consequence', 'counter', 'origin', 'action', 'reframing'];

const AI_TAG_LABELS = {
  assumption: { label: '假設', color: '#8B5CF6', description: 'AI 偵測到此回答包含未驗證的假設，建議納入假設追蹤。' },
  contradiction: { label: '矛盾', color: '#EC4899', description: 'AI 偵測到此回答涉及設計矛盾，建議納入矛盾識別。' },
};

export function SocraticTab({ questions, onUpdateQuestions, onDeleteQuestion, isBriefStale = false, projectId, mission = '', constraints = [] }: SocraticTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  const answeredCount = questions.filter((q) => q.answer && q.answer.trim().length >= 5).length;
  const totalCount = questions.length;
  const answeredCategories = new Set(
    questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)
  ).size;

  const filteredQuestions =
    categoryFilter === 'all' ? questions : questions.filter((q) => q.category === categoryFilter);

  const handleAnswer = (qId: string, value: string) => {
    setLocalAnswers((prev) => ({ ...prev, [qId]: value }));
  };
  // 離開輸入框時 → 才通知父元件存資料庫
  const handleAnswerBlur = (qId: string) => {
    const localValue = localAnswers[qId];
    if (localValue === undefined) return;
    // 跟資料庫的值一樣就不存
    const original = questions.find((q) => q.id === qId);
    if (original && original.answer === localValue) return;
    onUpdateQuestions(
      questions.map((q) => (q.id === qId ? { ...q, answer: localValue } : q))
    );
  };

  const handleConfirmTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => {
        if (q.id !== qId || !q.aiSuggestedTag) return q;
        return {
          ...q,
          aiTagConfirmed: true,
          taggedAsAssumption: q.aiSuggestedTag === 'assumption',
          taggedAsContradiction: q.aiSuggestedTag === 'contradiction',
        };
      })
    );
    toast.success('已確認 AI 標記');
  };

  const handleRevertTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          aiTagConfirmed: false,
          taggedAsAssumption: false,
          taggedAsContradiction: false,
        };
      })
    );
    toast.info('已撤回標記，AI 建議已恢復');
  };

  const handleSwitchTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => {
        if (q.id !== qId || !q.aiSuggestedTag) return q;
        const newTag = q.aiSuggestedTag === 'assumption' ? 'contradiction' : 'assumption';
        return {
          ...q,
          aiSuggestedTag: newTag,
          aiTagConfirmed: true,
          taggedAsAssumption: newTag === 'assumption',
          taggedAsContradiction: newTag === 'contradiction',
        };
      })
    );
    toast.success('已變更標記類型');
  };

  const handleDismissTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => (q.id === qId ? { ...q, aiTagDismissed: true, aiTagConfirmed: false } : q))
    );
    toast.info('已忽略 AI 建議');
  };

  const handleRestoreTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => (q.id === qId ? { ...q, aiTagDismissed: false } : q))
    );
    toast.success('已恢復 AI 建議');
  };

  const handleGenerateMore = async () => {
    setIsGenerating(true);
    try {
      const result = await socraticGenerate({
        project_id: projectId,
        mission,
        constraints,
        existing_questions: questions.map((q) => q.text),
      });
      const newQuestions: SocraticQuestion[] = result.questions.map((q, i) => ({
        id: `q-${Date.now()}-${i}`,
        category: q.category as QuestionCategory,
        text: q.text,
        answer: null,
        taggedAsAssumption: false,
        taggedAsContradiction: false,
        aiSuggestedTag: q.suggested_tag as 'assumption' | 'contradiction' | null,
        aiTagConfirmed: false,
        aiTagDismissed: false,
      }));
      onUpdateQuestions([...questions, ...newQuestions]);
      toast.success(`AI 已生成 ${newQuestions.length} 個新問題`);
    } catch (err) {
      console.error("Socratic generation failed:", err);
      toast.error("AI 生成問題失敗，請確認後端服務是否啟動");
    } finally {
      setIsGenerating(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground font-medium">尚無問題</p>
        <p className="text-sm text-muted-foreground">請確認 Brief 已完成，AI 將自動生成問題</p>
        <Button onClick={handleGenerateMore} disabled={isGenerating}>
          <Sparkles className="h-4 w-4 mr-1" /> 生成問題
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Purpose intro */}
      <SectionIntro text="AI 會根據您的 Brief 自動生成 7 類蘇格拉底式問題（含重構），引導您深入思考設計背後的假設與盲點。回答後 AI 會自動偵測是否包含假設或矛盾，並以建議標籤提示您確認。" />

      {/* Brief stale warning */}
      {isBriefStale && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Brief 已更新，部分問題可能已過時</p>
            <p className="text-xs text-muted-foreground">Mission 或約束條件變更後，建議重新生成問題以確保探索方向正確。</p>
          </div>
          <Button size="sm" onClick={handleGenerateMore} disabled={isGenerating}>
            <Sparkles className="h-3.5 w-3.5 mr-1" /> 重新生成
          </Button>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">索克拉底問答 — AI 引導式問題探索</h2>
          <Badge className="bg-blue-500 text-white text-xs">
            已回答 {answeredCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={(answeredCategories / 7) * 100} className="h-2" />
        <p className="text-xs text-muted-foreground">{answeredCategories}/7 類別已回答</p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = categoryFilter === cat;
          const config = cat === 'all' ? null : CATEGORY_CONFIG[cat];
          return (
            <Button
              key={cat}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 rounded-full"
              style={isActive && config ? { backgroundColor: config.color } : {}}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? '全部' : config!.labelZh}
            </Button>
          );
        })}
      </div>

      {/* Question cards */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const config = CATEGORY_CONFIG[q.category] ?? { label: q.category, labelZh: q.category, color: '#6B7280' };
          const isAnswered = q.answer && q.answer.trim().length >= 5;
          const hasPendingSuggestion = q.aiSuggestedTag && !q.aiTagConfirmed && !q.aiTagDismissed;
          const hasConfirmedTag = q.aiSuggestedTag && q.aiTagConfirmed;
          const hasDismissedTag = q.aiSuggestedTag && q.aiTagDismissed && !q.aiTagConfirmed;
          const tagConfig = q.aiSuggestedTag ? AI_TAG_LABELS[q.aiSuggestedTag] : null;

          return (
            <Card
              key={q.id}
              className={`transition-colors ${isAnswered ? 'border-l-[3px] border-l-green-600' : ''}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* AI question area */}
                <div className="bg-muted rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">AI</Badge>
                      <Badge
                        className="text-[10px] text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.labelZh}
                      </Badge>
                    </div>
                    {onDeleteQuestion && (
                      <button
                        onClick={() => onDeleteQuestion(q.id)}
                        className="p-1 rounded hover:bg-destructive/10"
                        title="刪除此問題"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm">{q.text}</p>
                </div>

                {/* User answer */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-destructive">★</span>
                    <span className="text-xs text-muted-foreground">您的回答</span>
                  </div>
                  <Textarea
                    value={localAnswers[q.id] ?? q.answer ?? ''}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    onBlur={() => handleAnswerBlur(q.id)}
                    placeholder="請在此輸入您的回答..."
                    rows={2}
                    maxLength={1000}
                    className="min-h-[60px] bg-background"
                  />
                  {(() => {
                    const val = (localAnswers[q.id] ?? q.answer ?? '').trim();
                    return val.length > 0 && val.length < 5 ? (
                      <p className="text-xs text-destructive">回答至少需要 5 個字元</p>
                    ) : null;
                  })()}
                </div>

                {/* AI auto-detected tag — pending confirmation */}
                {hasPendingSuggestion && tagConfig && (
                  <div
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 animate-in fade-in slide-in-from-top-1"
                    style={{ borderColor: `${tagConfig.color}40`, backgroundColor: `${tagConfig.color}08` }}
                  >
                    <Lightbulb className="h-4 w-4 shrink-0" style={{ color: tagConfig.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] text-white" style={{ backgroundColor: tagConfig.color }}>
                          AI 建議
                        </Badge>
                        <span className="text-xs font-medium">可能是{tagConfig.label}</span>
                        <HelpTooltip text={tagConfig.description} />
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 text-xs text-white"
                        style={{ backgroundColor: tagConfig.color }}
                        onClick={() => handleConfirmTag(q.id)}
                      >
                        <Check className="h-3 w-3 mr-1" /> 確認
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleDismissTag(q.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confirmed tag badge */}
                {hasConfirmedTag && tagConfig && (
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] text-white" style={{ backgroundColor: tagConfig.color }}>
                      ✓ 已標記為{tagConfig.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">已自動同步至{q.aiSuggestedTag === 'assumption' ? '假設追蹤' : '矛盾識別'}</span>
                    <div className="flex gap-1 ml-auto shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => handleSwitchTag(q.id)}
                      >
                        變更為{q.aiSuggestedTag === 'assumption' ? '矛盾' : '假設'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => handleRevertTag(q.id)}
                      >
                        撤回
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dismissed tag — recoverable */}
                {hasDismissedTag && tagConfig && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">AI 曾建議標記為{tagConfig.label}，已忽略</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => handleRestoreTag(q.id)}
                    >
                      恢復建議
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Batch confirm bar */}
      {answeredCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">本輪回答確認</p>
              <p className="text-xs text-muted-foreground">
                已回答 {answeredCount} 題，{answeredCategories}/6 類別覆蓋。確認後 AI 將根據回答內容分析假設與矛盾。
              </p>
            </div>
            <Button
              onClick={async () => {
                toast.success(`已確認 ${answeredCount} 題回答，AI 正在分析...`);

                // Heuristic tagger: analyzes answer content + question category
                const tagByHeuristic = (q: SocraticQuestion): 'assumption' | 'contradiction' | null => {
                  const a = q.answer ?? '';
                  const isAssumption = q.category === 'assumption'
                    || a.includes('假設') || a.includes('基於') || a.includes('認為')
                    || a.includes('預期') || a.includes('如果');
                  if (isAssumption) return 'assumption';
                  const isContradiction = q.category === 'counter'
                    || a.includes('矛盾') || a.includes('不足') || a.includes('衝突')
                    || a.includes('但是') || a.includes('卻');
                  if (isContradiction) return 'contradiction';
                  return null;
                };

                try {
                  // Call AI to generate analysis — the API returns new questions
                  // with suggested_tag, which we use as supplementary signal
                  const answeredTexts = questions
                    .filter((q) => q.answer && q.answer.trim().length >= 5)
                    .map((q) => `[${q.category}] Q: ${q.text} A: ${q.answer}`);
                  const result = await socraticGenerate({
                    project_id: projectId,
                    mission: answeredTexts.join('\n'),
                    constraints,
                    existing_questions: questions.map((q) => q.text),
                  });

                  // Count returned tags by type — use as distribution signal
                  const aiAssumptionCount = result.questions.filter((q) => q.suggested_tag === 'assumption').length;
                  const aiContradictionCount = result.questions.filter((q) => q.suggested_tag === 'contradiction').length;
                  const aiHasSignal = aiAssumptionCount > 0 || aiContradictionCount > 0;

                  const updated = questions.map((q) => {
                    if (q.answer && q.answer.trim().length >= 5 && !q.aiSuggestedTag && !q.aiTagDismissed) {
                      // Primary: heuristic based on answer content
                      const hTag = tagByHeuristic(q);
                      if (hTag) return { ...q, aiSuggestedTag: hTag };
                      // Secondary: if AI detected assumptions/contradictions exist,
                      // tag assumption-category questions as assumptions
                      if (aiHasSignal && q.category === 'assumption') {
                        return { ...q, aiSuggestedTag: 'assumption' as const };
                      }
                    }
                    return q;
                  });
                  onUpdateQuestions(updated);
                  toast.info('AI 分析完成，請檢查標記建議');
                } catch {
                  // Fallback: pure heuristic when backend unavailable
                  const updated = questions.map((q) => {
                    if (q.answer && q.answer.trim().length >= 5 && !q.aiSuggestedTag && !q.aiTagDismissed) {
                      const tag = tagByHeuristic(q);
                      if (tag) return { ...q, aiSuggestedTag: tag };
                    }
                    return q;
                  });
                  onUpdateQuestions(updated);
                  toast.info('AI 分析完成（離線模式），請檢查標記建議');
                }
              }}
              className="shrink-0"
            >
              <Check className="h-4 w-4 mr-1" /> 確認本輪回答
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bottom buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleGenerateMore} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          AI 生成更多問題
          <Badge variant="secondary" className="text-[10px] ml-1">AI</Badge>
        </Button>
      </div>
    </div>
  );
}
