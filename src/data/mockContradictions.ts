import { Contradiction } from "@/types/contradiction";

export const mockContradictions: Contradiction[] = [
  {
    id: "cont-001",
    projectId: "proj-001",
    naturalDescription: "增加馬達轉速可以提高效能，但同時會增加噪音和振動。",
    improvingParam: 9,
    worseningParam: 31,
    engineeringStatement: "當提高馬達轉速（速度）以增加效能時，物體產生的有害因素（噪音與振動）也隨之惡化。",
    physicalContradiction: "馬達需要同時高轉速（高效能）和低轉速（低噪音）。",
    severity: "major",
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "cont-002",
    projectId: "proj-001",
    naturalDescription: "使用更厚的材料提高強度，但增加了重量。",
    improvingParam: 14,
    worseningParam: 1,
    engineeringStatement: "當增加材料厚度以提升強度時，移動物體的重量也隨之增加，影響了整體效能。",
    physicalContradiction: "",
    createdAt: "2026-02-21T14:00:00Z",
    updatedAt: "2026-02-21T14:00:00Z",
  },
];
