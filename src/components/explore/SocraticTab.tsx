import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Pin, Loader2 } from "lucide-react";
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

  const handleTag = (qId: string, field: 'taggedAsAssumption' | 'taggedAsContradiction') => {
    onUpdateQuestions(
      questions.map((q) => (q.id === qId ? { ...q, [field]: !q[field] } : q))
    );
    toast.success(field === 'taggedAsAssumption' ? '已標記為假設' : '已標記為矛盾');
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
      <SectionIntro text="AI 會根據您的 Brief 自動生成 6 類蘇格拉底式問題，引導您深入思考設計背後的假設與盲點。回答問題後，可將重要發現標記為「假設」或「矛盾」，這些標記將自動帶入後續的矛盾識別與假設追蹤流程。" />

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

                {/* Tag buttons */}
                <div className="flex gap-2 items-center">
                  <Button
                    variant={q.taggedAsAssumption ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleTag(q.id, 'taggedAsAssumption')}
                  >
                    <Pin className="h-3 w-3 mr-1" />
                    {q.taggedAsAssumption ? '已標記為假設' : '標記為假設'}
                  </Button>
                  <HelpTooltip text="將此問答標記為「假設」後，它會自動出現在 Track（假設追蹤）的 Kanban 看板中，方便後續驗證與管理。" />
                  <Button
                    variant={q.taggedAsContradiction ? 'destructive' : 'ghost'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleTag(q.id, 'taggedAsContradiction')}
                  >
                    <Pin className="h-3 w-3 mr-1" />
                    {q.taggedAsContradiction ? '已標記為矛盾' : '標記為矛盾'}
                  </Button>
                  <HelpTooltip text="將此問答標記為「矛盾」後，它會自動加入矛盾識別清單，供您進一步分析為技術矛盾 (TC) 或物理矛盾 (PC)。" />
                </div>
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
