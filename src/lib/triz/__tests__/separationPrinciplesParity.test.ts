/**
 * Parity test: frontend vs backend separation principle lists.
 *
 * Reads backend/app/tools/separation_principles.py as text and verifies the
 * canonical id list matches the frontend SEPARATION_PRINCIPLES export.
 *
 * If either end changes an id without updating the other, this test fails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SEPARATION_PRINCIPLES } from '../separationPrinciples';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// src/lib/triz/__tests__/ -> repo_root/backend/app/tools/separation_principles.py
const BACKEND_PY_PATH = resolve(
  __dirname,
  '../../../../backend/app/tools/separation_principles.py',
);

function extractPyIds(pySource: string): string[] {
  // Match any quoted string literal shaped like "category.strategy" or
  // 'category.strategy'. We then filter to the canonical 4 categories so
  // unrelated strings (e.g. regex fragments, comments) are excluded.
  const pattern = /['"]([a-z_]+\.[a-z_]+)['"]/g;
  const allMatches = [...pySource.matchAll(pattern)].map((m) => m[1]);
  const validCategories = new Set(['time', 'space', 'condition', 'whole_part']);
  return allMatches.filter((id) => {
    const [cat] = id.split('.');
    return validCategories.has(cat);
  });
}

function dedupPreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

describe('Separation principles backend<->frontend parity', () => {
  it('backend Python file exists', () => {
    expect(() => readFileSync(BACKEND_PY_PATH, 'utf-8')).not.toThrow();
  });

  it('backend has exactly 16 canonical-shape ids', () => {
    const pySource = readFileSync(BACKEND_PY_PATH, 'utf-8');
    const unique = dedupPreserveOrder(extractPyIds(pySource));
    expect(unique.length).toBe(16);
  });

  it('backend and frontend id sets match exactly', () => {
    const pySource = readFileSync(BACKEND_PY_PATH, 'utf-8');
    const backendIds = new Set(extractPyIds(pySource));
    const frontendIds = new Set(SEPARATION_PRINCIPLES.map((p) => p.id));

    const backendOnly = [...backendIds]
      .filter((id) => !frontendIds.has(id))
      .sort();
    const frontendOnly = [...frontendIds]
      .filter((id) => !backendIds.has(id))
      .sort();

    expect(backendOnly).toEqual([]);
    expect(frontendOnly).toEqual([]);
  });

  it('canonical order matches', () => {
    const pySource = readFileSync(BACKEND_PY_PATH, 'utf-8');
    const backendOrder = dedupPreserveOrder(extractPyIds(pySource));
    const frontendOrder = SEPARATION_PRINCIPLES.map((p) => p.id);
    expect(frontendOrder).toEqual(backendOrder);
  });
});
