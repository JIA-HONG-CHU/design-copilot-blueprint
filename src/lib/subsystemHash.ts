/**
 * Interface contract fingerprinting (WBS 10.1).
 *
 * We need a short, stable content hash for the 6-dim interface contract map
 * so the SCAMPER page can detect whether RD has edited the contracts AFTER
 * the subsystem was confirmed. On mismatch the FE blocks SCAMPER generation
 * and asks RD to re-confirm.
 *
 * Design choices:
 *   - Not cryptographic. Collision resistance doesn't matter — we only need
 *     to distinguish "same snapshot" from "different snapshot" within a
 *     single session. djb2 is a 2-line classic with zero dependencies and
 *     zero crypto-noise in review.
 *   - Stable across neighbour key order and dimension order: we sort the
 *     neighbour keys and enumerate the 6 dims in a fixed sequence so that
 *     an object-property reorder doesn't look like an edit.
 *   - Returns "" for empty/null input so callers can treat missing
 *     contracts identically to "no hash yet" without null-checks.
 */

import type { InterfaceContractMap, InterfaceContract } from '@/types/generated/subsystem';

const DIMS: ReadonlyArray<keyof Omit<InterfaceContract, 'spatial'>> = [
  'envelope',
  'loadPath',
  'thermalPath',
  'signalPath',
  'datumTolerance',
  'serviceability',
];

function dimsFingerprint(c: InterfaceContract): string {
  return DIMS.map((d) => `${d}:${(c?.[d] ?? '').trim()}`).join('|');
}

function spatialFingerprint(c: InterfaceContract): string {
  if (!c.spatial) return 'sp:-';
  const b = c.spatial.bbox ?? undefined;
  const x = b?.x_mm ?? 0;
  const y = b?.y_mm ?? 0;
  const z = b?.z_mm ?? 0;
  const m = c.spatial.mass_g ?? 0;
  return `sp:${x}x${y}x${z}/${m}`;
}

/**
 * Stable short hash of a 6-dim interface contract map.
 *
 * Not cryptographic — just a content fingerprint for drift detection.
 * Same input always produces the same output; reordering neighbour keys
 * or whitespace-only edits inside a field will still produce a new hash
 * (we intentionally do NOT normalize whitespace beyond trim — end-of-string
 * trim catches accidental copy-paste tails without hiding real edits).
 */
export function hashContracts(
  contracts: InterfaceContractMap | undefined | null,
): string {
  if (!contracts || Object.keys(contracts).length === 0) return '';

  const sorted = Object.keys(contracts)
    .sort()
    .map((k) => {
      const c = contracts[k];
      return `${k}::${dimsFingerprint(c)}::${spatialFingerprint(c)}`;
    })
    .join('||');

  // djb2
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) {
    h = ((h << 5) + h + sorted.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

/**
 * Drift check extracted as a pure function so it can be unit-tested
 * without rendering the SCAMPER page. Returns true iff the subsystem has
 * been RD-confirmed at least once (`confirmedContractsHash` populated)
 * AND the live contracts no longer match that snapshot.
 *
 * Subsystems whose contracts have never been confirmed yet (hash === '')
 * are considered NOT drifted — they're simply unhashed, which is a
 * distinct state handled elsewhere by the confirm-to-hash flow.
 */
export function isContractDriftedSinceConfirm(
  subsystem: {
    interfaceContracts?: InterfaceContractMap;
    confirmedContractsHash?: string;
  },
): boolean {
  const confirmed = subsystem.confirmedContractsHash ?? '';
  if (!confirmed) return false;
  const current = hashContracts(subsystem.interfaceContracts);
  return current !== confirmed;
}
