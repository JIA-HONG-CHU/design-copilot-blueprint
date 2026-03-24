/**
 * useAiOperationGuard — lets AI operations continue in background after navigation.
 *
 * Design: ChatGPT-style — user can freely navigate, promises continue,
 * DB writes complete, results appear when user returns (via useQuery refetch).
 *
 * Provides:
 * - `isRunning` to show loading indicators while on the page
 * - `isMountedRef` for safe setState (skip if unmounted, avoid React warnings)
 * - `runGuarded` wraps async fn with op tracking + background toast on completion
 * - Soft `beforeunload` warning only for browser close/refresh (not in-app navigation)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export function useAiOperationGuard() {
  const [activeOps, setActiveOps] = useState(0);
  const isMountedRef = useRef(true);
  const isRunning = activeOps > 0;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Soft warning only for browser tab close / refresh (standard practice)
  useEffect(() => {
    if (!isRunning) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRunning]);

  const startOp = useCallback(() => setActiveOps((n) => n + 1), []);
  const endOp = useCallback(() => setActiveOps((n) => Math.max(0, n - 1)), []);

  /**
   * Wrap an async function with operation tracking.
   * - If component is still mounted: normal flow (setState, toast, etc.)
   * - If component unmounted mid-operation: DB writes complete in background,
   *   shows a global toast so user knows the result is ready.
   */
  const runGuarded = useCallback(
    async <T>(fn: () => Promise<T>, label?: string): Promise<T | undefined> => {
      startOp();
      try {
        const result = await fn();
        if (!isMountedRef.current && label) {
          toast.success(`${label}已完成（背景執行）`);
        }
        return result;
      } catch (err) {
        if (!isMountedRef.current && label) {
          toast.error(`${label}失敗（背景執行）`);
        }
        throw err;
      } finally {
        endOp();
      }
    },
    [startOp, endOp],
  );

  return { isRunning, isMountedRef, startOp, endOp, runGuarded };
}
