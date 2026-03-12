import type { BranchExploration, ExplorationRound, MinorContradiction } from '@/types/convergence';
import type { ConvergenceNode, ConvergenceEdge } from '@/types/solution';

/**
 * Mock exploration data for 2 contradictions with multi-round convergence.
 * Used by useConvergenceLoop to simulate AI autonomous exploration.
 */

// ── Branch 1: ec-001 速度↑ vs 噪音↑ (converges in 2 rounds) ──

const branch1Round1: ExplorationRound = {
  roundNumber: 1,
  solutions: [
    { id: 'sol-1a', path: 'TC', principleNumber: 1, principleName: '分割', suggestion: '將單一大齒輪分割為多級小齒輪組，降低單齒嚙合衝擊力，從而降低噪音。', score: 8.2, isRecommended: true },
    { id: 'sol-1b', path: 'PC', principleNumber: null, principleName: '時間分離', suggestion: '在高速段切換至磁力耦合傳動（無接觸），低速段使用齒輪直驅。', score: 6.5, isRecommended: false },
    { id: 'sol-1c', path: 'SF', principleNumber: 12, principleName: '等位性', suggestion: '引入彈性聯軸器作為中間體，吸收振動能量。', score: 5.1, isRecommended: false },
  ],
  adoptedSolutionId: 'sol-1a',
  scanResult: {
    newContradictions: [
      { id: 'sc-001', description: '多級齒輪組增加散熱需求 → 與輕量化目標矛盾', severity: 'major', resolved: false, sourceSolutionId: 'sol-1a' },
    ],
    hasNewFatalMajor: true,
  },
  timestamp: '2026-03-12T10:00:00Z',
};

const branch1Round2: ExplorationRound = {
  roundNumber: 2,
  solutions: [
    { id: 'sol-1d', path: 'PC', principleNumber: null, principleName: '空間分離', suggestion: '將散熱鰭片整合至齒輪箱外壁，利用行駛風冷實現被動散熱，不增加額外重量。', score: 7.8, isRecommended: true },
    { id: 'sol-1e', path: 'TC', principleNumber: 18, principleName: '機械振動', suggestion: '利用齒輪箱振動驅動壓電散熱微泵。', score: 6.0, isRecommended: false },
  ],
  adoptedSolutionId: 'sol-1d',
  scanResult: {
    newContradictions: [],
    hasNewFatalMajor: false,
  },
  timestamp: '2026-03-12T10:01:30Z',
};

// ── Branch 2: ec-002 強度↑ vs 重量↑ (converges in 3 rounds with Fatal) ──

const branch2Round1: ExplorationRound = {
  roundNumber: 1,
  solutions: [
    { id: 'sol-2a', path: 'TC', principleNumber: 40, principleName: '複合材料', suggestion: '以碳纖維蜂巢夾層結構替代鋁合金殼體，減重 35% 同時維持剛度。', score: 7.5, isRecommended: true },
    { id: 'sol-2b', path: 'PC', principleNumber: null, principleName: '條件分離', suggestion: '承力區使用鈦合金，非承力區使用工程塑膠。', score: 6.2, isRecommended: false },
    { id: 'sol-2c', path: 'SF', principleNumber: 5, principleName: '場引入', suggestion: '引入磁場懸浮支撐，取消部分機械支撐結構。', score: 4.0, isRecommended: false },
  ],
  adoptedSolutionId: 'sol-2a',
  scanResult: {
    newContradictions: [
      { id: 'sc-002', description: '碳纖維殼體成本超出預算 300%', severity: 'fatal', resolved: false, sourceSolutionId: 'sol-2a' },
      { id: 'sc-003', description: '碳纖維維修困難，現場不可修復', severity: 'major', resolved: false, sourceSolutionId: 'sol-2a' },
    ],
    hasNewFatalMajor: true,
  },
  timestamp: '2026-03-12T10:00:00Z',
};

const branch2Round2: ExplorationRound = {
  roundNumber: 2,
  solutions: [
    { id: 'sol-2d', path: 'TC', principleNumber: 35, principleName: '參數變化', suggestion: '採用漸變壁厚設計：應力集中區保持厚壁（鋁合金），低應力區改用薄壁 PA66+GF30，整體減重 20%。', score: 8.5, isRecommended: true },
    { id: 'sol-2e', path: 'PC', principleNumber: null, principleName: '系統層級分離', suggestion: '將殼體拆為內外雙層：內層承力（金屬），外層保護（塑膠）。', score: 7.0, isRecommended: false },
  ],
  adoptedSolutionId: 'sol-2d',
  scanResult: {
    newContradictions: [
      { id: 'sc-004', description: '漸變壁厚在振動環境下可能應力集中開裂', severity: 'major', resolved: false, sourceSolutionId: 'sol-2d' },
    ],
    hasNewFatalMajor: true,
  },
  timestamp: '2026-03-12T10:01:30Z',
};

const branch2Round3: ExplorationRound = {
  roundNumber: 3,
  solutions: [
    { id: 'sol-2f', path: 'TC', principleNumber: 3, principleName: '局部品質', suggestion: '在壁厚過渡區域增加 R3 圓角過渡 + 玻纖方向對齊，消除應力集中。FEA 模擬確認安全係數 > 2.0。', score: 8.8, isRecommended: true },
    { id: 'sol-2g', path: 'SF', principleNumber: 22, principleName: '轉化有害為有益', suggestion: '利用振動能量驅動壁厚區域的自加熱退火，提升局部韌性。', score: 5.5, isRecommended: false },
  ],
  adoptedSolutionId: 'sol-2f',
  scanResult: {
    newContradictions: [
      { id: 'sc-005', description: '圓角過渡增加模具成本約 5%', severity: 'minor', resolved: true, sourceSolutionId: 'sol-2f' },
    ],
    hasNewFatalMajor: false,
  },
  timestamp: '2026-03-12T10:03:00Z',
};

// ── Assembled branch data ──

export const mockBranches: BranchExploration[] = [
  {
    contradictionId: 'ec-001',
    contradictionLabel: '速度提升 vs 噪音增加',
    rounds: [branch1Round1, branch1Round2],
    status: 'converged',
    depth: 2,
  },
  {
    contradictionId: 'ec-002',
    contradictionLabel: '結構強度 vs 重量限制',
    rounds: [branch2Round1, branch2Round2, branch2Round3],
    status: 'converged',
    depth: 3,
  },
];

export const mockRiskRegister: MinorContradiction[] = [
  { id: 'sc-005', description: '圓角過渡增加模具成本約 5%', sourceBranchId: 'ec-002', sourceRound: 3 },
];

// ── Convergence graph snapshots (built progressively) ──

export function buildGraphAtIteration(iteration: number): { nodes: ConvergenceNode[]; edges: ConvergenceEdge[] } {
  const allNodes: ConvergenceNode[] = [];
  const allEdges: ConvergenceEdge[] = [];

  // Branch 1 nodes
  if (iteration >= 1) {
    allNodes.push({ id: 'cont-001', label: '速度↑噪音↑', type: 'contradiction', severity: 'major', resolved: iteration >= 2, x: 20, y: 20 });
    allNodes.push({ id: 'sol-1a', label: '#1 分割', type: 'solution', x: 180, y: 20 });
    allEdges.push({ from: 'cont-001', to: 'sol-1a' });
  }
  if (iteration >= 1) {
    allNodes.push({ id: 'sc-001', label: '散熱↑輕量↓', type: 'contradiction', severity: 'major', resolved: iteration >= 2, x: 340, y: 20 });
    allEdges.push({ from: 'sol-1a', to: 'sc-001' });
  }
  if (iteration >= 2) {
    allNodes.push({ id: 'sol-1d', label: '空間分離散熱', type: 'solution', x: 500, y: 20 });
    allEdges.push({ from: 'sc-001', to: 'sol-1d' });
  }

  // Branch 2 nodes
  if (iteration >= 1) {
    allNodes.push({ id: 'cont-002', label: '強度↑重量↑', type: 'contradiction', severity: 'fatal', resolved: iteration >= 3, x: 20, y: 100 });
    allNodes.push({ id: 'sol-2a', label: '#40 複合材料', type: 'solution', x: 180, y: 100 });
    allEdges.push({ from: 'cont-002', to: 'sol-2a' });
  }
  if (iteration >= 1) {
    allNodes.push({ id: 'sc-002', label: '成本超標', type: 'contradiction', severity: 'fatal', resolved: iteration >= 2, x: 340, y: 80 });
    allNodes.push({ id: 'sc-003', label: '維修困難', type: 'contradiction', severity: 'major', resolved: iteration >= 2, x: 340, y: 140 });
    allEdges.push({ from: 'sol-2a', to: 'sc-002' });
    allEdges.push({ from: 'sol-2a', to: 'sc-003' });
  }
  if (iteration >= 2) {
    allNodes.push({ id: 'sol-2d', label: '#35 漸變壁厚', type: 'solution', x: 500, y: 100 });
    allEdges.push({ from: 'sc-002', to: 'sol-2d' });
    allEdges.push({ from: 'sc-003', to: 'sol-2d' });
  }
  if (iteration >= 2) {
    allNodes.push({ id: 'sc-004', label: '應力集中', type: 'contradiction', severity: 'major', resolved: iteration >= 3, x: 660, y: 100 });
    allEdges.push({ from: 'sol-2d', to: 'sc-004' });
  }
  if (iteration >= 3) {
    allNodes.push({ id: 'sol-2f', label: '#3 局部品質', type: 'solution', x: 820, y: 100 });
    allEdges.push({ from: 'sc-004', to: 'sol-2f' });
    // Minor (non-blocking)
    allNodes.push({ id: 'sc-005', label: '模具成本+5%', type: 'contradiction', severity: 'minor', resolved: true, x: 820, y: 170 });
    allEdges.push({ from: 'sol-2f', to: 'sc-005' });
  }

  return { nodes: allNodes, edges: allEdges };
}

// ── Simulation step sequence ──

export interface SimulationStep {
  iteration: number;
  activeBranch: string;
  round: ExplorationRound;
  cumulativeFatal: { resolved: number; total: number };
  cumulativeMajor: { resolved: number; total: number };
  minorCount: number;
  confidence: number;
  health: 'healthy' | 'warning' | 'critical' | 'circular';
}

export const simulationSteps: SimulationStep[] = [
  // Iteration 1: Both branches Round 1 (parallel)
  {
    iteration: 1,
    activeBranch: 'ec-001',
    round: branch1Round1,
    cumulativeFatal: { resolved: 0, total: 1 },
    cumulativeMajor: { resolved: 0, total: 2 },
    minorCount: 0,
    confidence: 0,
    health: 'healthy',
  },
  {
    iteration: 1,
    activeBranch: 'ec-002',
    round: branch2Round1,
    cumulativeFatal: { resolved: 0, total: 1 },
    cumulativeMajor: { resolved: 0, total: 2 },
    minorCount: 0,
    confidence: 0,
    health: 'healthy',
  },
  // Iteration 2: Branch 1 converges, Branch 2 continues
  {
    iteration: 2,
    activeBranch: 'ec-001',
    round: branch1Round2,
    cumulativeFatal: { resolved: 0, total: 1 },
    cumulativeMajor: { resolved: 1, total: 2 },
    minorCount: 0,
    confidence: 33,
    health: 'warning',
  },
  {
    iteration: 2,
    activeBranch: 'ec-002',
    round: branch2Round2,
    cumulativeFatal: { resolved: 1, total: 1 },
    cumulativeMajor: { resolved: 1, total: 3 },
    minorCount: 0,
    confidence: 50,
    health: 'warning',
  },
  // Iteration 3: Branch 2 final round → convergence
  {
    iteration: 3,
    activeBranch: 'ec-002',
    round: branch2Round3,
    cumulativeFatal: { resolved: 1, total: 1 },
    cumulativeMajor: { resolved: 3, total: 3 },
    minorCount: 1,
    confidence: 100,
    health: 'healthy',
  },
];
