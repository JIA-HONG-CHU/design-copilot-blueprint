import { describe, it, expect } from 'vitest';
import { hashContracts, isContractDriftedSinceConfirm } from '../subsystemHash';
import type { InterfaceContractMap } from '@/types/generated/subsystem';

const base: InterfaceContractMap = {
  Frame: {
    envelope: 'downtube bracket',
    loadPath: '4xM8',
    thermalPath: 'air',
    signalPath: '-',
    datumTolerance: '+/- 0.3 mm',
    serviceability: '5 min',
  },
  BMS: {
    envelope: 'pcb 80x60',
    loadPath: 'none',
    thermalPath: 'conductive',
    signalPath: 'CAN',
    datumTolerance: '+/- 0.2',
    serviceability: 'bolt on',
  },
};

describe('hashContracts', () => {
  it('returns empty string for undefined/null/empty input', () => {
    expect(hashContracts(undefined)).toBe('');
    expect(hashContracts(null)).toBe('');
    expect(hashContracts({})).toBe('');
  });

  it('produces the same hash for the same contracts', () => {
    expect(hashContracts(base)).toBe(hashContracts(base));
    // Deep clone should hash identically.
    const clone = JSON.parse(JSON.stringify(base)) as InterfaceContractMap;
    expect(hashContracts(clone)).toBe(hashContracts(base));
  });

  it('ignores neighbour insertion order (stable across key reorder)', () => {
    const reordered: InterfaceContractMap = {
      BMS: base.BMS,
      Frame: base.Frame,
    };
    expect(hashContracts(reordered)).toBe(hashContracts(base));
  });

  it('changes when a dimension text is edited', () => {
    const edited: InterfaceContractMap = {
      ...base,
      Frame: { ...base.Frame, loadPath: '6xM8' },
    };
    expect(hashContracts(edited)).not.toBe(hashContracts(base));
  });

  it('changes when a spatial bbox is added', () => {
    const withSpatial: InterfaceContractMap = {
      ...base,
      Frame: {
        ...base.Frame,
        spatial: {
          bbox: { x_mm: 200, y_mm: 100, z_mm: 50 },
          mass_g: 1200,
        },
      },
    };
    expect(hashContracts(withSpatial)).not.toBe(hashContracts(base));
  });
});

describe('isContractDriftedSinceConfirm', () => {
  it('returns false when no hash has been captured yet', () => {
    expect(
      isContractDriftedSinceConfirm({ interfaceContracts: base, confirmedContractsHash: '' }),
    ).toBe(false);
    expect(
      isContractDriftedSinceConfirm({ interfaceContracts: base }),
    ).toBe(false);
  });

  it('returns false when contracts match the captured hash', () => {
    const h = hashContracts(base);
    expect(
      isContractDriftedSinceConfirm({
        interfaceContracts: base,
        confirmedContractsHash: h,
      }),
    ).toBe(false);
  });

  it('returns true after a dimension is edited post-confirmation', () => {
    const h = hashContracts(base);
    const edited: InterfaceContractMap = {
      ...base,
      BMS: { ...base.BMS, signalPath: 'LIN' },
    };
    expect(
      isContractDriftedSinceConfirm({
        interfaceContracts: edited,
        confirmedContractsHash: h,
      }),
    ).toBe(true);
  });
});
