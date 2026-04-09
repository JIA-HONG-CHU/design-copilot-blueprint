import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DecomposedChildrenList } from '../DecomposedChildrenList';
import type { ExploreContradiction } from '@/types/explore';
import type { SeparationCategory } from '@/lib/triz/separationPrinciples';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChild(
  id: string,
  category: SeparationCategory,
  derivedParameter: string,
): ExploreContradiction {
  return {
    id,
    projectId: 'proj-1',
    type: 'PC',
    improvingParam: null,
    worseningParam: null,
    pcAttributeA: 'A',
    pcAttributeNotA: '¬A',
    sfSubstance1: null,
    sfSubstance2: null,
    sfField: null,
    sfInteraction: null,
    sfCompleteness: null,
    description: `desc-${id}`,
    engineeringStatement: null,
    status: 'confirmed',
    source: 'ai',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    parentContradictionId: 'tc-parent-001',
    derivedParameter,
    subsystemHint: null,
    separationPrincipleId: null,
    separationCategory: category,
    separationRationale: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DecomposedChildrenList', () => {
  it('returns null when children is empty', () => {
    const { container } = render(
      <DecomposedChildrenList children={[]} parentId="tc-001" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders N cards when N children provided', () => {
    const kids = [
      makeChild('c1', 'time', 'Param1'),
      makeChild('c2', 'space', 'Param2'),
      makeChild('c3', 'condition', 'Param3'),
    ];
    render(
      <DecomposedChildrenList children={kids} parentId="tc-001" />,
    );
    const cards = screen.getAllByTestId('decomposed-pc-card');
    expect(cards).toHaveLength(3);
  });

  it('sorts children by separation_category (time → space → condition → whole_part)', () => {
    // Provide in wrong order
    const kids = [
      makeChild('c-wp', 'whole_part', 'WholePart'),
      makeChild('c-time', 'time', 'Time'),
      makeChild('c-cond', 'condition', 'Condition'),
      makeChild('c-space', 'space', 'Space'),
    ];
    render(
      <DecomposedChildrenList children={kids} parentId="tc-001" />,
    );
    const cards = screen.getAllByTestId('decomposed-pc-card');
    const titles = cards.map(
      (card) => within(card).getByTestId('pc-derived-parameter').textContent,
    );
    expect(titles).toEqual(['Time', 'Space', 'Condition', 'WholePart']);
  });

  it('shows correct count in the header', () => {
    const kids = [
      makeChild('c1', 'time', 'P1'),
      makeChild('c2', 'space', 'P2'),
    ];
    render(
      <DecomposedChildrenList children={kids} parentId="tc-001" />,
    );
    expect(screen.getByTestId('decomposed-children-toggle')).toHaveTextContent(
      '已深挖 2 個物理矛盾',
    );
  });
});
