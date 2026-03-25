export function ConvergeIndicator() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px w-12 bg-border" />
        <span className="font-medium text-foreground/70">▼ 匯流評估 ▼</span>
        <div className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}
