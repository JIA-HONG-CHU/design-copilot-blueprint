import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, X, Lightbulb } from "lucide-react";
import type { SocraticQuestion, QuestionCategory } from "@/types/explore";
import { CATEGORY_CONFIG } from "@/types/explore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SectionIntro } from "@/components/ui/section-intro";

interface SocraticTabProps {
  questions: SocraticQuestion[];
  onUpdateQuestions: (questions: SocraticQuestion[]) => void;
  projectId: string;
}

const CATEGORY_FILTERS: (QuestionCategory | 'all')[] = ['all', 'clarification', 'assumption', 'consequence', 'counter', 'origin', 'action'];

const AI_TAG_LABELS = {
  assumption: { label: '假設', color: '#8B5CF6', description: 'AI 偵測到此回答包含未驗證的假設，建議納入假設追蹤。' },
  contradiction: { label: '矛盾', color: '#EC4899', description: 'AI 偵測到此回答涉及設計矛盾，建議納入矛盾識別。' },
};

export function SocraticTab({ questions, onUpdateQuestions, projectId }: SocraticTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const answeredCount = questions.filter((q) => q.answer && q.answer.trim().length >= 5).length;
  const totalCount = questions.length;
  const answeredCategories = new Set(
    questions.filter((q) => q.answer && q.answer.trim().length >= 5).map((q) => q.category)
  ).size;

  const filteredQuestions =
    categoryFilter === 'all' ? questions : questions.filter((q) => q.category === categoryFilter);

  const handleAnswer = (qId: string, value: string) => {
    onUpdateQuestions(questions.map((q) => (q.id === qId ? { ...q, answer: value } : q)));
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

  const handleDismissTag = (qId: string) => {
    onUpdateQuestions(
      questions.map((q) => (q.id === qId ? { ...q, aiSuggestedTag: null, aiTagConfirmed: false } : q))
    );
    toast.info('已忽略 AI 建議');
  };

  const handleGenerateMore = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newQ: SocraticQuestion = {
      id: `q-${Date.now()}`,
      category: 'consequence',
      text: '如果選擇齒輪傳動方案，對噪音和維護成本的影響是什麼？與皮帶傳動相比有哪些優劣勢？',
      answer: null,
      taggedAsAssumption: false,
      taggedAsContradiction: false,
      aiSuggestedTag: null,
      aiTagConfirmed: false,
    };
    onUpdateQuestions([...questions, newQ]);
    setIsGenerating(false);
    toast.success('AI 已生成新問題');
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
      <SectionIntro text="AI 會根據您的 Brief 自動生成 6 類蘇格拉底式問題，引導您深入思考設計背後的假設與盲點。回答後 AI 會自動偵測是否包含假設或矛盾，並以建議標籤提示您確認。" />

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">索克拉底問答 — AI 引導式問題探索</h2>
          <Badge className="bg-[#3B82F6] text-white text-xs">
            已回答 {answeredCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={(answeredCategories / 6) * 100} className="h-2" />
        <p className="text-xs text-muted-foreground">{answeredCategories}/6 類別已回答</p>
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
          const config = CATEGORY_CONFIG[q.category];
          const isAnswered = q.answer && q.answer.trim().length >= 5;
          const hasPendingSuggestion = q.aiSuggestedTag && !q.aiTagConfirmed;
          const hasConfirmedTag = q.aiSuggestedTag && q.aiTagConfirmed;
          const tagConfig = q.aiSuggestedTag ? AI_TAG_LABELS[q.aiSuggestedTag] : null;

          return (
            <Card
              key={q.id}
              className={`transition-colors ${isAnswered ? 'border-l-[3px] border-l-[#28a745]' : ''}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* AI question area */}
                <div className="bg-muted rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">AI</Badge>
                    <Badge
                      className="text-[10px] text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.labelZh}
                    </Badge>
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
                    value={q.answer || ''}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    placeholder="請在此輸入您的回答..."
                    rows={2}
                    maxLength={1000}
                    className="min-h-[60px] bg-background"
                  />
                  {q.answer && q.answer.trim().length > 0 && q.answer.trim().length < 5 && (
                    <p className="text-xs text-destructive">回答至少需要 5 個字元</p>
                  )}
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
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
