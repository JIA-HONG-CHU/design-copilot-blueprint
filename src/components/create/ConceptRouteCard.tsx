import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowRight, Layers, Box } from 'lucide-react';
import type { ConceptRoute } from '@/types/conceptRoute';
import { ADOPTION_TYPE_LABELS } from '@/types/conceptRoute';

interface Props {
  route: ConceptRoute;
}

const dimensionColor: Record<string, string> = {
  '空間': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  '時間': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  '條件': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  '材料': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function ConceptRouteCard({ route }: Props) {
  const isComposite = route.type === 'composite';

  return (
    <Card className={isComposite ? 'border-primary/30' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {isComposite ? (
            <Layers className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Box className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-semibold font-mono">{route.id}</span>
          <Badge
            variant={isComposite ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {isComposite ? 'Composite' : 'Single'}
          </Badge>
          {isComposite && (
            <Badge variant="outline" className="text-[10px]">
              {route.composition.length} 解合併
            </Badge>
          )}
        </div>

        {/* Composition chain */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {route.composition.map((entry, idx) => (
            <div key={entry.solutionId} className="flex items-center gap-1.5">
              {idx > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              <div className="rounded-lg border bg-background p-2 space-y-1 min-w-[140px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium">{entry.sourcePrinciple}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {entry.concrete.length > 40 ? entry.concrete.slice(0, 40) + '...' : entry.concrete}
                </p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={`text-[9px] ${dimensionColor[entry.dimension] ?? ''}`}>
                    {entry.dimension}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {entry.adoptionType} {ADOPTION_TYPE_LABELS[entry.adoptionType].zh}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rationale */}
        <p className="text-xs text-muted-foreground leading-relaxed pl-1 border-l-2 border-muted">
          {route.compositionRationale}
        </p>

        {/* Anti-pattern warnings */}
        {route.antiPatternWarnings.length > 0 && (
          <div className="space-y-1">
            {route.antiPatternWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
