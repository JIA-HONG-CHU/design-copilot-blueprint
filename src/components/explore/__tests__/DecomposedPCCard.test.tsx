import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecomposedPCCard, type DecomposedPCCardProps } from '../DecomposedPCCard';
import type { ExploreContradiction } from '@/types/explore';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makePC(overrides: Partial<ExploreContradiction> = {}): ExploreContradiction {
  return {
    id: 'pc-child-001',
    projectId: 'proj-1',
    type: 'PC',
    improvingParam: null,
    worseningParam: null,
    pcAttributeA: '高硬度',
    pcAttributeNotA: '低硬度',
    sfSubstance1: null,
    sfSubstance2: null,
    sfField: null,
    sfInteraction: null,
    sfCompleteness: null,
    description: '齒輪模數需要同時大和小',
    engineeringStatement: null,
    status: 'confirmed',
    source: 'ai',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    parentContradictionId: 'tc-parent-001',
    derivedParameter: '齒輪模數',
    subsystemHint: '變速箱',
    separationPrincipleId: 'space.partition_combine',
    separationCategory: 'space',
    separationRationale: '齒輪不同區域可以使用不同模數',
    ...overrides,
  };
}

function renderCard(
  pcOverrides: Partial<ExploreContradiction> = {},
  propOverrides: Partial<Omit<DecomposedPCCardProps, 'pc'>> = {},
) {
  const pc = makePC(pcOverrides);
  return render(<DecomposedPCCard pc={pc} {...propOverrides} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DecomposedPCCard', () => {
  it('renders with derivedParameter as title', () => {
    renderCard({ derivedParameter: '齒輪模數' });
    expect(screen.getByTestId('pc-derived-parameter')).toHaveTextContent('齒輪模數');
  });

  it('renders category label from CATEGORY_LABEL_ZH', () => {
    renderCard({ separationCategory: 'space' });
    expect(screen.getByTestId('pc-category-label')).toHaveTextContent('空間分離');
  });

  it('renders separation principle name from canonical 16', () => {
    renderCard({ separationPrincipleId: 'space.partition_combine' });
    expect(screen.getByTestId('pc-principle')).toHaveTextContent('分割/組合');
  });

  it('shows low-confidence warning when confidence < 0.5', () => {
    renderCard({}, { confidence: 0.3 });
    expect(screen.getByTestId('low-confidence-warning')).toBeInTheDocument();
  });

  it('does NOT show warning when confidence >= 0.5', () => {
    renderCard({}, { confidence: 0.8 });
    expect(screen.queryByTestId('low-confidence-warning')).not.toBeInTheDocument();
  });

  it('greys out card when confidence < 0.5', () => {
    renderCard({}, { confidence: 0.3 });
    const card = screen.getByTestId('decomposed-pc-card');
    expect(card.className).toContain('opacity-70');
  });

  it('does NOT grey out card when confidence >= 0.5', () => {
    renderCard({}, { confidence: 0.8 });
    const card = screen.getByTestId('decomposed-pc-card');
    expect(card.className).not.toContain('opacity-70');
  });

  it('collapsible rationale toggles on click', () => {
    renderCard({ separationRationale: '齒輪不同區域可以使用不同模數' });
    // rationale body should not be visible initially
    expect(screen.queryByTestId('pc-rationale-body')).not.toBeInTheDocument();
    // click the toggle
    fireEvent.click(screen.getByTestId('pc-rationale-toggle'));
    // now visible
    expect(screen.getByTestId('pc-rationale-body')).toHaveTextContent(
      '齒輪不同區域可以使用不同模數',
    );
    // click again to collapse
    fireEvent.click(screen.getByTestId('pc-rationale-toggle'));
    expect(screen.queryByTestId('pc-rationale-body')).not.toBeInTheDocument();
  });

  it('renders attribute pair chips', () => {
    renderCard({ pcAttributeA: '高硬度', pcAttributeNotA: '低硬度' });
    const pair = screen.getByTestId('pc-attribute-pair');
    expect(pair).toHaveTextContent('高硬度');
    expect(pair).toHaveTextContent('低硬度');
  });

  it('renders subsystem hint badge', () => {
    renderCard({ subsystemHint: '變速箱' });
    expect(screen.getByTestId('pc-subsystem-hint')).toHaveTextContent('變速箱');
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    const pc = makePC();
    render(<DecomposedPCCard pc={pc} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId('pc-edit-btn'));
    expect(onEdit).toHaveBeenCalledWith(pc);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<DecomposedPCCard pc={makePC()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId('pc-delete-btn'));
    expect(onDelete).toHaveBeenCalledWith('pc-child-001');
  });

  it('hides edit/delete buttons when callbacks not provided', () => {
    renderCard();
    expect(screen.queryByTestId('pc-edit-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pc-delete-btn')).not.toBeInTheDocument();
  });
});
