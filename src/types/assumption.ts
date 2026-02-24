import { z } from "zod";

export type AssumptionStatus = "pending" | "validating" | "validated" | "refuted";

export interface Assumption {
  id: string;
  content: string;
  source: string;
  worstConsequence: string;
  minValidation: string;
  validationCost: string;
  status: AssumptionStatus;
  createdAt: string;
  updatedAt: string;
}

export const ASSUMPTION_STATUS_LABELS: Record<AssumptionStatus, string> = {
  pending: "待驗證",
  validating: "驗證中",
  validated: "已驗證",
  refuted: "已推翻",
};

export const assumptionSchema = z.object({
  content: z.string().trim().min(10, "假設內容為必填項，且需至少 10 個字元。").max(300, "假設內容不可超過 300 個字元。"),
  source: z.string().trim().min(1, "依據來源為必填項。"),
  worstConsequence: z.string().trim().min(1, "最壞後果為必填項。"),
  minValidation: z.string().trim().min(1, "最小驗證方法為必填項。"),
  validationCost: z.string().trim().min(1, "驗證成本/週期為必填項。"),
});

export type AssumptionFormValues = z.infer<typeof assumptionSchema>;
