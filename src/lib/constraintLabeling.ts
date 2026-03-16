interface ConstraintLabelRule {
  label: string;
  keywords: string[];
}

export interface ConstraintGroup {
  label: string;
  items: string[];
}

const CONSTRAINT_LABEL_RULES: ConstraintLabelRule[] = [
  { label: "法規與標準", keywords: ["iso", "en", "astm", "din", "jis", "標準", "法規", "規範", "認證", "測試"] },
  { label: "幾何與尺寸", keywords: ["尺寸", "公差", "直徑", "長度", "角度", "alignment", "stack", "reach", "mm", "幾何"] },
  { label: "結構與強度", keywords: ["強度", "剛性", "屈曲", "疲勞", "壽命", "載重", "buckling", "stiffness", "frame"] },
  { label: "製程與製造", keywords: ["製程", "加工", "成型", "焊接", "鑽孔", "塗裝", "表面粗糙", "ra", "量產"] },
  { label: "成本與資源", keywords: ["成本", "usd", "預算", "$", "工時", "材料成本"] },
  { label: "性能與目標", keywords: ["效率", "速度", "續航", "噪音", "功率", "性能", "kpi"] },
  { label: "介面與相容", keywords: ["介面", "相容", "規格", "bb", "螺紋", "接口", "配合", "組裝"] },
  { label: "安全與風險", keywords: ["安全", "風險", "失效", "危害", "爆裂", "保護", "防護"] },
];

function normalizeConstraintKey(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function inferConstraintLabel(input: string): string {
  const normalized = input.toLowerCase();
  let bestLabel = "其他";
  let bestScore = 0;

  for (const rule of CONSTRAINT_LABEL_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLabel = rule.label;
    }
  }

  return bestLabel;
}

export function classifyHardConstraints(
  items: string[],
  existingLabelMap: Record<string, string>,
): { groups: ConstraintGroup[]; nextLabelMap: Record<string, string>; hasUpdates: boolean } {
  const nextLabelMap: Record<string, string> = { ...existingLabelMap };
  let hasUpdates = false;
  const grouped = new Map<string, string[]>();

  for (const item of items) {
    const key = normalizeConstraintKey(item);
    const label = nextLabelMap[key] ?? inferConstraintLabel(item);

    if (!nextLabelMap[key]) {
      nextLabelMap[key] = label;
      hasUpdates = true;
    }

    const bucket = grouped.get(label) ?? [];
    bucket.push(item);
    grouped.set(label, bucket);
  }

  return {
    groups: Array.from(grouped.entries()).map(([label, groupItems]) => ({ label, items: groupItems })),
    nextLabelMap,
    hasUpdates,
  };
}
