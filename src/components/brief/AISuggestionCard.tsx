import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X } from "lucide-react";

interface AISuggestionCardProps {
  title: string;
  content: string;
  onAdopt: () => void;
  onSkip: () => void;
}

export function AISuggestionCard({ title, content, onAdopt, onSkip }: AISuggestionCardProps) {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="secondary" className="text-xs">AI</Badge>
        </div>
        <p className="text-sm">{content}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={onAdopt}>
            <Check className="h-3 w-3 mr-1" />
            採用
          </Button>
          <Button size="sm" variant="ghost" onClick={onSkip}>
            <X className="h-3 w-3 mr-1" />
            跳過
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
