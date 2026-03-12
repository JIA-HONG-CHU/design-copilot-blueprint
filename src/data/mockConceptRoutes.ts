import type {
  MultiSolutionAdoptionState,
  CompatibilityMatrix,
  ConceptRoute,
  AntiPatternCheck,
} from '@/types/conceptRoute';

/**
 * Mock data for Multi-Solution Adoption Strategy (Step 5a-X).
 *
 * Based on the convergence loop output:
 *   Branch ec-001 "速度↑ vs 噪音↑" → adopted: TC #1 分割, PC 時間分離
 *   Branch ec-002 "強度↑ vs 重量↑" → adopted: SF 複合材料, TC #35 參數變化
 *
 * 4 solutions → 6 pairs (4C2) compatibility analysis.
 */

const mockMatrix: CompatibilityMatrix = {
  solutions: [
    { id: 'sol-tc1', label: '#1 分割', dimension: '空間' },
    { id: 'sol-pc-time', label: 'PC 時間分離', dimension: '時間' },
    { id: 'sol-sf-comp', label: 'SF 複合材料', dimension: '材料' },
    { id: 'sol-tc35', label: '#35 參數變化', dimension: '條件' },
  ],
  pairs: [
    // sol-tc1 × sol-pc-time → M2 互相強化
    {
      solutionAId: 'sol-tc1',
      solutionBId: 'sol-pc-time',
      result: 'compatible',
      adoptionType: 'M2',
      reason: '分割原理在空間上區隔承力區/減振區，時間分離在不同工況切換模式，兩者形成空間+時間的雙重解耦。',
    },
    // sol-tc1 × sol-sf-comp → M1 不同維度
    {
      solutionAId: 'sol-tc1',
      solutionBId: 'sol-sf-comp',
      result: 'compatible',
      adoptionType: 'M1',
      reason: '分割原理作用於結構幾何（空間），複合材料作用於材料選擇（材料），維度獨立無衝突。',
    },
    // sol-tc1 × sol-tc35 → M1 不同維度
    {
      solutionAId: 'sol-tc1',
      solutionBId: 'sol-tc35',
      result: 'compatible',
      adoptionType: 'M1',
      reason: '分割原理操作空間配置，參數變化操作控制條件（轉速/阻尼隨載荷調變），無物理衝突。',
    },
    // sol-pc-time × sol-sf-comp → M1 不同維度
    {
      solutionAId: 'sol-pc-time',
      solutionBId: 'sol-sf-comp',
      result: 'compatible',
      adoptionType: 'M1',
      reason: '時間分離操作工況切換（時間），複合材料操作材質（材料），維度獨立。',
    },
    // sol-pc-time × sol-tc35 → M1 不同維度
    {
      solutionAId: 'sol-pc-time',
      solutionBId: 'sol-tc35',
      result: 'needs_verification',
      adoptionType: 'M1',
      reason: '時間分離與參數變化皆涉及動態切換邏輯，需確認控制策略不衝突（可能共用感測器輸入）。',
    },
    // sol-sf-comp × sol-tc35 → M4 互斥
    {
      solutionAId: 'sol-sf-comp',
      solutionBId: 'sol-tc35',
      result: 'exclusive',
      adoptionType: 'M4',
      reason: '複合材料要求固定材質配比以確保強度，參數變化要求材質可隨條件調整（如可變剛度材料），兩者在同一結構件上互斥。',
    },
  ],
};

const mockRoutes: ConceptRoute[] = [
  {
    id: 'CR-001',
    type: 'composite',
    composition: [
      {
        solutionId: 'sol-tc1',
        sourcePrinciple: '#1 分割',
        concrete: '殼體分區：承力區高模量碳纖維 / 減振區阻尼橡膠夾層',
        dimension: '空間',
        adoptionType: 'M2',
      },
      {
        solutionId: 'sol-pc-time',
        sourcePrinciple: 'PC 時間分離',
        concrete: '爬坡模式鎖定剛性路徑、巡航模式啟用柔性減振路徑',
        dimension: '時間',
        adoptionType: 'M2',
      },
      {
        solutionId: 'sol-tc35',
        sourcePrinciple: '#35 參數變化',
        concrete: '阻尼係數隨轉速/負載即時調變（磁流變液或電控閥）',
        dimension: '條件',
        adoptionType: 'M1',
      },
    ],
    compositionRationale:
      '三條解法分別作用於空間（結構分區）、時間（工況切換）、條件（參數自適應）三個獨立維度。#1+PC 形成空間-時間雙重解耦的正回饋關係 (M2)，#35 在條件維度補充自適應能力 (M1)。',
    antiPatternWarnings: [
      '合併 3 條解法（經驗甜蜜點 2-3 條，仍在安全範圍）',
      'PC 時間分離與 #35 參數變化的控制策略需額外驗證 (E1 以上)',
    ],
  },
  {
    id: 'CR-002',
    type: 'single',
    composition: [
      {
        solutionId: 'sol-sf-comp',
        sourcePrinciple: 'SF 複合材料',
        concrete: '碳纖維-鋁合金複合結構，內層鋁合金承載、外層碳纖維減重',
        dimension: '材料',
        adoptionType: 'M4',
      },
    ],
    compositionRationale:
      '與 #35 參數變化在同一結構件上物理互斥 (M4)，無法合併。獨立成 Route，走材料固定配比路線。',
    antiPatternWarnings: [],
  },
];

const mockAntiPatternChecks: AntiPatternCheck[] = [
  {
    label: '無強行合併互斥解',
    passed: true,
    detail: 'SF 複合材料與 #35 參數變化已識別為 M4 互斥，分為獨立 Route。',
  },
  {
    label: '合併數量 ≤ 4',
    passed: true,
    detail: 'CR-001 合併 3 條（≤4 經驗上限），CR-002 為單一解。',
  },
  {
    label: '交互驗證需求已標記',
    passed: true,
    detail: 'CR-001 中 PC 時間分離與 #35 參數變化需 E1 以上交互驗證，已列入警告。',
  },
];

export const mockAdoptionState: MultiSolutionAdoptionState = {
  matrix: mockMatrix,
  recommendedRoutes: mockRoutes,
  antiPatternChecks: mockAntiPatternChecks,
};
