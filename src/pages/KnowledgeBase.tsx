import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Search, BookOpen, FileText, Lightbulb, Calendar, User } from "lucide-react";
import { mockKnowledgeArticles } from "@/data/mockKnowledge";
import { KnowledgeArticle } from "@/types/knowledge";

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  playbook: { label: "Playbook", icon: <BookOpen className="h-3.5 w-3.5" /> },
  "case-study": { label: "案例", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  template: { label: "模板", icon: <FileText className="h-3.5 w-3.5" /> },
};

const CATEGORIES = ["all", "playbook", "case-study", "template"] as const;

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockKnowledgeArticles.filter((a) => {
      const matchCategory = activeCategory === "all" || a.category === activeCategory;
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  const selectedArticle = slug
    ? mockKnowledgeArticles.find((a) => a.slug === slug)
    : null;

  // Detail view
  if (selectedArticle) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/knowledge-base")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_MAP[selectedArticle.category]?.icon}
                <span className="ml-1">{CATEGORY_MAP[selectedArticle.category]?.label}</span>
              </Badge>
              {selectedArticle.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
              {selectedArticle.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{selectedArticle.author}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{selectedArticle.publishedAt}</span>
            </div>
          </div>
        </div>

        <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardContent className="p-6 prose prose-sm max-w-none">
            {selectedArticle.content.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-4 mb-1">{line.slice(4)}</h3>;
              if (line.startsWith("- ")) return <li key={i} className="text-sm ml-4 list-disc">{line.slice(2)}</li>;
              if (line.startsWith("| ")) return <p key={i} className="text-sm font-mono text-muted-foreground">{line}</p>;
              if (line.trim() === "") return <br key={i} />;
              if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. "))
                return <li key={i} className="text-sm ml-4 list-decimal">{line.slice(3)}</li>;
              return <p key={i} className="text-sm leading-relaxed">{line}</p>;
            })}
          </CardContent>
        </Card>

        {selectedArticle.relatedLinks.length > 0 && (
          <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">相關文檔</h3>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.relatedLinks.map((link, i) => (
                  <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                    {link.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Noto Sans TC", "Helvetica Neue", Arial, sans-serif' }}>
          知識庫
        </h1>
        <p className="text-sm text-muted-foreground">瀏覽 Playbook、歷史案例與決策模板</p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋知識庫..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "all" ? "全部" : CATEGORY_MAP[cat]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Article list */}
      {filtered.length === 0 ? (
        <Card className="rounded-lg" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="font-medium">沒有找到相關知識</p>
            <p className="text-sm mt-1">請嘗試調整搜尋條件或分類篩選。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((article) => (
            <Card
              key={article.id}
              className="rounded-lg cursor-pointer hover:shadow-md transition-shadow"
              style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
              onClick={() => navigate(`/knowledge-base/${article.slug}`)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_MAP[article.category]?.icon}
                    <span className="ml-1">{CATEGORY_MAP[article.category]?.label}</span>
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{article.author}</span>
                  <span>{article.publishedAt}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {article.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
