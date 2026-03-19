import type { EvidenceMatrixRow, RiskItem, Experiment } from '@/types/designReview';

export const mockEvidenceMatrix: Record<string, EvidenceMatrixRow[]> = {
  'proj-001': [
    { assumptionCode: 'A-001', summary: '散熱片面積 ≥ 50cm² 足以控溫', currentLevel: 'E2', isNorthStar: true, experiments: [{ expCode: 'Exp-001', level: 'E2', status: 'Done' }] },
    { assumptionCode: 'A-002', summary: '磁力耦合器傳動效率 ≥ 90%', currentLevel: 'E0', isNorthStar: true, experiments: [] },
    { assumptionCode: 'A-003', summary: 'PA66+GF30 可承受 500N 側向載荷', currentLevel: 'E1', isNorthStar: false, experiments: [{ expCode: 'Exp-002', level: 'E1', status: 'Running' }] },
    { assumptionCode: 'A-004', summary: '密封結構可達 IP55 防護等級', currentLevel: 'E3', isNorthStar: false, experiments: [{ expCode: 'Exp-003', level: 'E3', status: 'Done' }] },
    { assumptionCode: 'A-005', summary: '碳纖維增強材料供應商交期 ≤ 4 週', currentLevel: 'E1', isNorthStar: false, experiments: [{ expCode: 'Exp-004', level: 'E1', status: 'Plan' }] },
    { assumptionCode: 'A-006', summary: '雙繞組切換延遲 ≤ 50ms', currentLevel: 'E0', isNorthStar: true, experiments: [] },
    { assumptionCode: 'A-007', summary: '噪音在 65dB 以下可接受', currentLevel: 'E2', isNorthStar: false, experiments: [{ expCode: 'Exp-005', level: 'E2', status: 'Done' }] },
  ],
};

export const mockRisks: Record<string, RiskItem[]> = {
  'proj-001': [
    { id: 'R-001', description: '磁力耦合器在高溫下退磁', failureMode: '傳動效率驟降至 <70%', probability: 4, severity: 4, mitigation: '選用耐高溫磁鐵 (SmCo 系列)' },
    { id: 'R-002', description: '碳纖維殼體疲勞裂紋', failureMode: '結構破壞導致漏油', probability: 2, severity: 5, mitigation: '' },
    { id: 'R-003', description: '供應商交期延誤', failureMode: '專案時程延遲 ≥ 2 週', probability: 3, severity: 3, mitigation: '備選供應商名單已建立' },
    { id: 'R-004', description: '雙繞組切換產生電磁干擾', failureMode: '控制板誤動作', probability: 3, severity: 4, mitigation: '' },
  ],
};

export const mockExperiments: Record<string, Experiment[]> = {
  'proj-001': [
    { id: 'Exp-001', name: '散熱片熱仿真', linkedAssumptions: ['A-001'], evidenceLevel: 'E2', method: 'ANSYS 熱仿真', successCriteria: 'ΔT ≤ 5°C', status: 'Done', result: '仿真顯示 ΔT=3.2°C，通過' },
    { id: 'Exp-002', name: 'PA66+GF30 材料強度測試', linkedAssumptions: ['A-003'], evidenceLevel: 'E1', method: '工程估算 + 文獻查閱', successCriteria: '抗拉強度 ≥ 120 MPa', status: 'Running', result: '' },
    { id: 'Exp-003', name: 'IP55 密封測試', linkedAssumptions: ['A-004'], evidenceLevel: 'E3', method: '原型密封測試', successCriteria: '防水測試通過 30 min', status: 'Done', result: '原型測試通過，防水 45min 無滲透' },
    { id: 'Exp-004', name: '碳纖維供應商交期確認', linkedAssumptions: ['A-005'], evidenceLevel: 'E1', method: '供應商詢價', successCriteria: '確認交期 ≤ 4 週', status: 'Plan', result: '' },
    { id: 'Exp-005', name: '噪音量測', linkedAssumptions: ['A-007'], evidenceLevel: 'E2', method: 'FEA 聲學仿真', successCriteria: '噪音 ≤ 65 dB(A)', status: 'Done', result: '仿真結果 62.3 dB(A)，通過' },
  ],
};
