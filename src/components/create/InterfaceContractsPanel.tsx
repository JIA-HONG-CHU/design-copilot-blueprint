import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InterfaceContract,
  InterfaceContractMap,
  SpatialEstimate,
} from "@/types/generated/subsystem";
import { INTERFACE_CONTRACT_DIMS } from "@/types/generated/subsystem";

/**
 * InterfaceContractsPanel — display-layer primitive for the 6-dim + spatial
 * interface contract map of a single subsystem tree node.
 *
 * Renders at ANY level (system / module / component) because the underlying
 * data model places contracts on any node that has neighbours — polymorphism
 * belongs at the data layer, not hardcoded to "module".
 *
 * @see Forward_Subsystem_Discovery_Architecture.md §6.5
 * @see docs/diagrams/create-ux-spec.md Tab ② 區塊 A
 */
interface InterfaceContractsPanelProps {
  contracts?: InterfaceContractMap | null;
  /** Optional hint for panel sizing — system level cards tend to need a wider grid. */
  level?: "system" | "module" | "component";
}

export function InterfaceContractsPanel({
  contracts,
  level = "module",
}: InterfaceContractsPanelProps) {
  if (!contracts || Object.keys(contracts).length === 0) return null;

  const entries: ReadonlyArray<readonly [string, InterfaceContract]> =
    Object.entries(contracts);

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group mt-2">
          <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
          <Link2 className="h-3 w-3" />
          <span>Interface Contracts ({entries.length})</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn("mt-2 space-y-3", level === "system" ? "ml-6" : "ml-5")}>
          {entries.map(([target, contract]) => (
            <ContractCard
              key={target}
              target={target}
              contract={contract}
              level={level}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Single contract card (one neighbour ↔ current node)
// ---------------------------------------------------------------------------

function ContractCard({
  target,
  contract,
  level,
}: {
  target: string;
  contract: InterfaceContract;
  level: "system" | "module" | "component";
}) {
  const populated = INTERFACE_CONTRACT_DIMS.filter(
    (d) => contract[d.key] && contract[d.key].trim() !== "",
  );
  const hasSpatial = !!contract.spatial;
  const isEmpty = populated.length === 0 && !hasSpatial;

  return (
    <div className="text-xs border rounded-lg p-3 bg-muted/20 space-y-1.5">
      <p className="font-medium text-foreground">↔ {target}</p>

      {isEmpty ? (
        <p className="text-[10px] text-muted-foreground italic">
          （此介面尚未填寫任何維度，請重新執行 Suggest Subsystems 或手動編輯）
        </p>
      ) : (
        <>
          {populated.length > 0 && (
            <div
              className={cn(
                "grid gap-1.5",
                level === "system"
                  ? "grid-cols-1 md:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2",
              )}
            >
              {populated.map((d) => (
                <div key={d.key}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {d.labelZh}
                  </span>
                  <p className="text-muted-foreground leading-relaxed line-clamp-2">
                    {contract[d.key]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {hasSpatial && <SpatialBlock spatial={contract.spatial!} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spatial sub-block (bbox + mass + confidence badge + reference trace)
// ---------------------------------------------------------------------------

/**
 * Confidence colour system — mirrors docs/diagrams/create-ux-spec.md v6
 * §Spatial Confidence 視覺對應. Colours deliberately match the dark-theme-
 * safe palette used in Mermaid diagrams across the architecture docs.
 */
const CONFIDENCE_STYLE: Record<
  NonNullable<SpatialEstimate["confidence"]>,
  { label: string; cls: string }
> = {
  rd_confirmed: {
    label: "RD 簽核",
    cls: "bg-emerald-900 text-white border-emerald-950 dark:bg-emerald-800",
  },
  library: {
    label: "Library",
    cls: "bg-emerald-100 text-emerald-900 border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  estimate: {
    label: "Estimate",
    cls: "bg-amber-100 text-amber-900 border-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
};

function SpatialBlock({ spatial }: { spatial: SpatialEstimate }) {
  const bbox = spatial.bbox;
  const bboxText = bbox
    ? `${fmt(bbox.x_mm)}×${fmt(bbox.y_mm)}×${fmt(bbox.z_mm)} mm`
    : "—";
  const massText = spatial.mass_g != null ? `${fmt(spatial.mass_g)} g` : "—";
  const confidence = spatial.confidence ?? "estimate";
  const source = spatial.reference_source ?? "";
  // llm_estimate gets its own red style (it's the weakest signal, RD should override)
  const isLlmEstimate = source === "llm_estimate" || (!source && confidence === "estimate");
  const confCls = isLlmEstimate
    ? "bg-red-100 text-red-900 border-red-800 dark:bg-red-900/40 dark:text-red-200"
    : CONFIDENCE_STYLE[confidence]?.cls ?? CONFIDENCE_STYLE.estimate.cls;
  const confLabel = isLlmEstimate
    ? "LLM 估計"
    : CONFIDENCE_STYLE[confidence]?.label ?? confidence;

  return (
    <div
      className="mt-2 pt-2 border-t border-dashed border-border/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]"
      title={source ? `reference_source: ${source}` : undefined}
    >
      <span className="font-mono text-muted-foreground">📐 {bboxText}</span>
      <span className="font-mono text-muted-foreground">⚖ {massText}</span>
      <span
        className={cn(
          "px-1.5 py-0.5 rounded border font-semibold",
          confCls,
        )}
      >
        {confLabel}
      </span>
      {source && !isLlmEstimate && (
        <span className="text-muted-foreground truncate max-w-[220px]" title={source}>
          src: {source.length > 32 ? `${source.slice(0, 32)}…` : source}
        </span>
      )}
      {spatial.mounting_pattern && (
        <span className="text-muted-foreground">
          · mount: {spatial.mounting_pattern}
        </span>
      )}
    </div>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
