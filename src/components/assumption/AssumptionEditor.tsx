import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { assumptionSchema, type Assumption, type AssumptionFormValues } from "@/types/assumption";
import { Save, Loader2 } from "lucide-react";

interface AssumptionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assumption: Assumption | null; // null = create mode
  onSave: (data: AssumptionFormValues, id?: string) => void;
}

export function AssumptionEditor({ open, onOpenChange, assumption, onSave }: AssumptionEditorProps) {
  const isEdit = !!assumption;

  const [content, setContent] = useState(assumption?.content ?? "");
  const [source, setSource] = useState(assumption?.source ?? "");
  const [worstConsequence, setWorstConsequence] = useState(assumption?.worstConsequence ?? "");
  const [minValidation, setMinValidation] = useState(assumption?.minValidation ?? "");
  const [validationCost, setValidationCost] = useState(assumption?.validationCost ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when assumption changes
  const resetForm = () => {
    setContent(assumption?.content ?? "");
    setSource(assumption?.source ?? "");
    setWorstConsequence(assumption?.worstConsequence ?? "");
    setMinValidation(assumption?.minValidation ?? "");
    setValidationCost(assumption?.validationCost ?? "");
    setErrors({});
  };

  // Reset on open
  useState(() => {
    resetForm();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: AssumptionFormValues = { content, source, worstConsequence, minValidation, validationCost };
    const result = assumptionSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);

    onSave(result.data, assumption?.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "編輯假設" : "新增假設"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改假設內容與驗證規劃。" : "新增一條設計假設，並規劃其驗證方法。"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {/* Content */}
          <div className="space-y-1.5">
            <Label>假設內容 <span className="text-destructive">*</span></Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="描述設計假設..."
              rows={3}
              maxLength={300}
              disabled={isSubmitting}
            />
            <div className="flex justify-between">
              {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
              <span className="text-xs text-muted-foreground ml-auto">{content.length}/300</span>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>依據來源 <span className="text-destructive">*</span></Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="例：供應商規格書、內部計算模型"
              disabled={isSubmitting}
            />
            {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
          </div>

          {/* Worst Consequence */}
          <div className="space-y-1.5">
            <Label>若錯了最壞後果 <span className="text-destructive">*</span></Label>
            <Textarea
              value={worstConsequence}
              onChange={(e) => setWorstConsequence(e.target.value)}
              placeholder="若此假設錯誤，最壞的情況是..."
              rows={2}
              disabled={isSubmitting}
            />
            {errors.worstConsequence && <p className="text-xs text-destructive">{errors.worstConsequence}</p>}
          </div>

          {/* Min Validation */}
          <div className="space-y-1.5">
            <Label>最小驗證方法 <span className="text-destructive">*</span></Label>
            <Textarea
              value={minValidation}
              onChange={(e) => setMinValidation(e.target.value)}
              placeholder="用最少成本驗證此假設的方法..."
              rows={2}
              disabled={isSubmitting}
            />
            {errors.minValidation && <p className="text-xs text-destructive">{errors.minValidation}</p>}
          </div>

          {/* Validation Cost */}
          <div className="space-y-1.5">
            <Label>驗證成本/週期 <span className="text-destructive">*</span></Label>
            <Input
              value={validationCost}
              onChange={(e) => setValidationCost(e.target.value)}
              placeholder="例：NT$ 15,000 / 1 週"
              disabled={isSubmitting}
            />
            {errors.validationCost && <p className="text-xs text-destructive">{errors.validationCost}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />儲存中...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />儲存</>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
