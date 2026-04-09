/**
 * TRIZ 物理矛盾分離原則 — 16 項常數
 *
 * 權威來源：rd_assistant_design_system/triz_knowledge_base/04_separation_principles.md
 * Backend parity: backend/app/tools/separation_principles.py
 *
 * 任何修改必須同步 backend 並跑 parity test。
 */

export type SeparationCategory = 'time' | 'space' | 'condition' | 'whole_part';

export interface SeparationPrinciple {
  id: string;
  category: SeparationCategory;
  nameZh: string;
  physicalPrinciple: string;
  crossDomainExamples: string;
}

export const SEPARATION_PRINCIPLES: SeparationPrinciple[] = [
  // --- 時間分離 (Separation in Time) ---
  {
    id: 'time.pre_action',
    category: 'time',
    nameZh: '預先動作',
    physicalPrinciple:
      '在 t < t_need 時預先完成，利用 stored energy E = ½kx² 或 E = ½CV²',
    crossDomainExamples:
      '預應力混凝土（σ_residual 在澆築時施加，數十年後仍在工作）、超級電容預充電（ms 級放電需求用 s 級充電滿足）',
  },
  {
    id: 'time.post_action',
    category: 'time',
    nameZh: '事後動作',
    physicalPrinciple: '利用 relaxation time τ_relax 在不需要後自動恢復',
    crossDomainExamples:
      '形狀記憶合金（A_f 溫度後恢復原形，Ni-Ti ε_rec ≈ 8%）、自癒合材料（裂紋觸發 Diels-Alder 逆反應→鍵合→癒合，τ ≈ hours）',
  },
  {
    id: 'time.periodic_switching',
    category: 'time',
    nameZh: '週期性切換',
    physicalPrinciple: '利用 f_switch >> f_disturbance 快速交替',
    crossDomainExamples:
      'PWM 驅動（f=20kHz，負載看到等效直流）、脈衝雷射冷卻（on: 加工 10μs → off: 冷卻 990μs，duty 1%，峰值功率↑100×）',
  },
  {
    id: 'time.accelerated_pass',
    category: 'time',
    nameZh: '加速通過',
    physicalPrinciple: '暴露劑量 D = P×t，t→0 使 D < D_threshold',
    crossDomainExamples:
      '急冷淬火（通過 TTT nose 避免析出，v_cool > v_critical）、航太器快速穿越輻射帶（ΔD_radiation ∝ t_transit）',
  },

  // --- 空間分離 (Separation in Space) ---
  {
    id: 'space.local_quality',
    category: 'space',
    nameZh: '局部品質/梯度材料',
    physicalPrinciple: '依 σ_vm(x,y,z) 分佈放置材料',
    crossDomainExamples:
      'FGM 功能梯度材料（表面 ZrO₂ 隔熱 k=2 W/mK、基底 Ni 承載 σ_y=500 MPa）、人工牙根（表面多孔 HA 促骨整合、核心緻密鈦承載）',
  },
  {
    id: 'space.partition_combine',
    category: 'space',
    nameZh: '分割/組合',
    physicalPrinciple: '界面設計使不同區域獨立',
    crossDomainExamples:
      '雙層管（內層耐蝕 316L、外層高強碳鋼）、三明治板（面板鋁承載、核心泡沫輕量）',
  },
  {
    id: 'space.nesting',
    category: 'space',
    nameZh: '嵌套',
    physicalPrinciple: '同心結構 Z_inner ≠ Z_outer',
    crossDomainExamples:
      '同軸電纜（內導體傳信號、外屏蔽隔 EMI）、雙壁真空杯（內壁反射、外壁隔熱）',
  },
  {
    id: 'space.geometry_transform',
    category: 'space',
    nameZh: '幾何變換',
    physicalPrinciple: '改變幾何使力/場在不同方向不同',
    crossDomainExamples:
      '碳纖維鋪層角度設計（0° 方向 E=140GPa 承載、90° 方向 E=10GPa 柔性）、非對稱翼型（上表面低壓=升力、下表面高壓=支撐）',
  },

  // --- 條件分離 (Separation upon Condition) ---
  {
    id: 'condition.phase_change',
    category: 'condition',
    nameZh: '相變/狀態變化',
    physicalPrinciple:
      'Clausius-Clapeyron dP/dT = ΔH/(TΔV) — 相變時特性突變',
    crossDomainExamples:
      'SMA 形狀記憶合金：T < M_f → 馬氏體（可變形）、T > A_f → 奧氏體（高彈性回復），NiTi 血管支架在體溫觸發展開；VO₂ 熱致變色玻璃：T < 68°C 透明→T > 68°C 反射紅外',
  },
  {
    id: 'condition.threshold_trigger',
    category: 'condition',
    nameZh: '參數閾值觸發',
    physicalPrinciple: '臨界現象 — 越過臨界點 X_c 時系統行為質變',
    crossDomainExamples:
      '限扭器（τ > τ_set → 打滑保護）、保險絲（I > I_rated → 熔斷 in ms）、超導體（T < T_c → ρ = 0，MRI 磁體 NbTi T_c=9.2K）',
  },
  {
    id: 'condition.responsive_material',
    category: 'condition',
    nameZh: '環境響應材料',
    physicalPrinciple: '刺激回應聚合物 — ΔG_stimulus 驅動構型/體積變化',
    crossDomainExamples:
      'pH 響應水凝膠（藥物緩釋，pH < 5 收縮釋放→pH 7 膨脹封閉）、光致變色鏡片（UV→分子異構化→深色）、自調節 PTC 加熱器（T↑→R↑→P↓→穩態）',
  },
  {
    id: 'condition.external_field',
    category: 'condition',
    nameZh: '外場控制',
    physicalPrinciple: '施加/移除外場即時切換特性',
    crossDomainExamples:
      '磁流變液（B=0 液態→B≠0 固態，τ_y ∝ B²，響應 <1ms）、電致變色玻璃（V=0 透明→V≠0 著色）、電潤濕（接觸角 cos θ = cos θ₀ + εV²/2γd）',
  },

  // --- 整體與局部分離 (Separation between Whole and Parts) ---
  {
    id: 'whole_part.composite',
    category: 'whole_part',
    nameZh: '複合結構',
    physicalPrinciple:
      'Rule of Mixtures: P_c = P₁V₁ + P₂V₂ — 兩種材料混合可得介於兩者之間的任意特性',
    crossDomainExamples:
      'CFRP（碳纖維 σ=3500MPa + 環氧 ε_fail=5% → 高強高韌複合體）、鋼筋混凝土（鋼筋抗拉 + 混凝土抗壓 → 雙向承載）',
  },
  {
    id: 'whole_part.porous_hollow',
    category: 'whole_part',
    nameZh: '多孔/中空',
    physicalPrinciple:
      '相對密度 ρ*/ρ_s 控制 — Gibson-Ashby: σ*/σ_s ∝ (ρ*/ρ_s)^1.5，E*/E_s ∝ (ρ*/ρ_s)^2',
    crossDomainExamples:
      '蜂巢結構（ρ*/ρ_s ≈ 0.03，比剛度超過實心材料）、骨骼 trabecular 結構（Wolff\'s law 沿應力方向排列）、氣凝膠（ρ ≈ 3 kg/m³，k ≈ 0.013 W/mK）',
  },
  {
    id: 'whole_part.gradient',
    category: 'whole_part',
    nameZh: '梯度/漸變',
    physicalPrinciple: '避免界面突變 → σ_interface → 0',
    crossDomainExamples:
      '梯度折射率透鏡 GRIN（n(r) 漸變，無球面像差）、梯度多孔鈦植入物（表面促骨生長、核心承載）、漸變齒形（噪音降低 5-10 dB，接觸應力均勻化）',
  },
  {
    id: 'whole_part.fractal',
    category: 'whole_part',
    nameZh: '自相似/碎形',
    physicalPrinciple: '碎形維度 D > 拓撲維度，表面積/體積→∞',
    crossDomainExamples:
      '碎形天線（同一尺寸涵蓋多頻段，Sierpinski gasket 天線）、肺泡碎形結構（300M 個肺泡，表面積 70 m² 裝在 6L 體積內）、碎形散熱鰭片（有效散熱面積↑3-5×）',
  },
];

export const CATEGORY_COLOR: Record<SeparationCategory, string> = {
  time: 'blue', // Tailwind color key; UI maps to bg-blue-500 etc.
  space: 'green',
  condition: 'orange',
  whole_part: 'purple',
};

export const CATEGORY_LABEL_ZH: Record<SeparationCategory, string> = {
  time: '時間分離',
  space: '空間分離',
  condition: '條件分離',
  whole_part: '整體與局部分離',
};

export function getSeparationPrinciple(
  id: string,
): SeparationPrinciple | undefined {
  return SEPARATION_PRINCIPLES.find((p) => p.id === id);
}

export function getSeparationPrinciplesByCategory(
  category: SeparationCategory,
): SeparationPrinciple[] {
  return SEPARATION_PRINCIPLES.filter((p) => p.category === category);
}
