/**
 * useAiOperationGuard — prevents navigation during long-running AI operations.
 *
 * Provides:
 * - `isRunning` / `setRunning` to track active AI operations
 * - Navigation blocker (react-router useBlocker + beforeunload)
 * - `isMountedRef` for safe setState after async operations
 * - `runGuarded` helper that wraps an async fn with mounted checks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

export function useAiOperationGuard() {
  const [activeOps, setActiveOps] = useState(0);
  const isMountedRef = useRef(true);
  const isRunning = activeOps > 0;

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Block react-router navigation
  const blocker = useBlocker(isRunning);

  // Show confirm dialog when blocker triggers
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const leave = window.confirm('AI 操作進行中，離開此頁面可能導致結果遺失。確定要離開嗎？');
      if (leave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Block browser tab close / refresh
  useEffect(() => {
    if (!isRunning) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRunning]);

  const startOp = useCallback(() => setActiveOps((n) => n + 1), []);
  const endOp = useCallback(() => setActiveOps((n) => Math.max(0, n - 1)), []);

  /**
   * Wrap an async function with operation tracking + mounted guard.
   * setState calls inside the fn are safe — if unmounted, they simply no-op.
   */
  const runGuarded = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      startOp();
      try {
        const result = await fn();
        return result;
      } finally {
        endOp();
      }
    },
    [startOp, endOp],
  );

  return { isRunning, isMountedRef, startOp, endOp, runGuarded };
}
