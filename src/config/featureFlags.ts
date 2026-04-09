/**
 * Runtime feature flags for the Create / Design Copilot app.
 *
 * Flags default to **off** and are enabled per-env via Vite `VITE_*`
 * environment variables so that production rolls out changes gradually.
 *
 * Refs:
 *   - docs/e2e/module/TRIZ_Layered_Drilldown_Development_WBS.md §1.4 / §12.1
 *   - docs/e2e/TRIZ_Layered_DrillDown_Optimization.md §9.3 migration path
 */

function readEnv(name: string): string | undefined {
  // `import.meta.env` may be undefined in certain ts-node contexts (tests);
  // guard both accesses.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env;
  return env?.[name];
}

function readBool(name: string, defaultValue: boolean): boolean {
  const raw = readEnv(name);
  if (raw == null) return defaultValue;
  return raw === "true" || raw === "1" || raw === "on";
}

export const featureFlags = {
  /**
   * **TRIZ Layered Mode** (WBS 1.4) — when true, the Create Tab ① TRIZ
   * sub-tab calls `POST /triz/solve-layered` and renders the v7 drill-down
   * diagnostic card (L1 / L2 / L3 + deepen_link + differential_analysis +
   * layered Concept Route). When false, the legacy `POST /triz/solve`
   * per-path UI is shown.
   *
   * Rollout phases (TRIZ_Layered_DrillDown_Optimization.md §9.3):
   *   1. Pre-launch  — flag off, new endpoint registered, schemas ready
   *   2. Internal grey — flag on for a handful of test projects
   *   3. Docs + prompts aligned
   *   4. Full switch — flag default on, legacy /triz/solve stays as primitive
   */
  trizLayeredMode: readBool("VITE_TRIZ_LAYERED_MODE", false),
} as const;

export type FeatureFlags = typeof featureFlags;

export function isTrizLayeredModeOn(): boolean {
  return featureFlags.trizLayeredMode;
}
