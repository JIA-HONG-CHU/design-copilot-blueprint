import { describe, it, expect } from 'vitest';
import {
  SEPARATION_PRINCIPLES,
  getSeparationPrinciple,
  getSeparationPrinciplesByCategory,
  CATEGORY_COLOR,
  CATEGORY_LABEL_ZH,
  type SeparationCategory,
} from '../separationPrinciples';

const CANONICAL_IDS = [
  'time.pre_action',
  'time.post_action',
  'time.periodic_switching',
  'time.accelerated_pass',
  'space.local_quality',
  'space.partition_combine',
  'space.nesting',
  'space.geometry_transform',
  'condition.phase_change',
  'condition.threshold_trigger',
  'condition.responsive_material',
  'condition.external_field',
  'whole_part.composite',
  'whole_part.porous_hollow',
  'whole_part.gradient',
  'whole_part.fractal',
];

describe('SEPARATION_PRINCIPLES constant', () => {
  it('contains exactly 16 items', () => {
    expect(SEPARATION_PRINCIPLES).toHaveLength(16);
  });

  it('contains all 16 canonical ids (order-agnostic)', () => {
    const ids = SEPARATION_PRINCIPLES.map((p) => p.id).sort();
    expect(ids).toEqual([...CANONICAL_IDS].sort());
  });

  it('preserves canonical order (time, space, condition, whole_part)', () => {
    const ids = SEPARATION_PRINCIPLES.map((p) => p.id);
    expect(ids).toEqual(CANONICAL_IDS);
  });

  it('has exactly 4 items per category', () => {
    const categories: SeparationCategory[] = [
      'time',
      'space',
      'condition',
      'whole_part',
    ];
    for (const cat of categories) {
      const items = SEPARATION_PRINCIPLES.filter((p) => p.category === cat);
      expect(items).toHaveLength(4);
    }
  });

  it('every item has non-empty nameZh / physicalPrinciple / crossDomainExamples', () => {
    for (const p of SEPARATION_PRINCIPLES) {
      expect(p.nameZh.trim().length).toBeGreaterThan(0);
      expect(p.physicalPrinciple.trim().length).toBeGreaterThan(0);
      expect(p.crossDomainExamples.trim().length).toBeGreaterThan(0);
    }
  });

  it('CATEGORY_COLOR and CATEGORY_LABEL_ZH cover all 4 categories', () => {
    const categories: SeparationCategory[] = [
      'time',
      'space',
      'condition',
      'whole_part',
    ];
    for (const cat of categories) {
      expect(CATEGORY_COLOR[cat]).toBeTruthy();
      expect(CATEGORY_LABEL_ZH[cat]).toBeTruthy();
    }
  });
});

describe('getSeparationPrinciple', () => {
  it('returns the expected item for time.pre_action', () => {
    const p = getSeparationPrinciple('time.pre_action');
    expect(p).toBeDefined();
    expect(p?.id).toBe('time.pre_action');
    expect(p?.category).toBe('time');
    expect(p?.nameZh).toBe('預先動作');
  });

  it('returns undefined for an unknown id', () => {
    expect(getSeparationPrinciple('nope.bogus')).toBeUndefined();
  });
});

describe('getSeparationPrinciplesByCategory', () => {
  it('returns exactly 4 items for space', () => {
    const items = getSeparationPrinciplesByCategory('space');
    expect(items).toHaveLength(4);
    expect(items.every((p) => p.category === 'space')).toBe(true);
  });

  it('returns exactly 4 items for whole_part', () => {
    const items = getSeparationPrinciplesByCategory('whole_part');
    expect(items).toHaveLength(4);
  });
});
