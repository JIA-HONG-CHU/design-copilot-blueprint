import { z } from "zod";

export interface TaskDefinitionKPI {
  id: string;
  name: string;
  target: string;
  method: string;
}

export interface TaskDefinitionData {
  mission: string;
  hardConstraints: string[];
  softObjectives: string[];
  nonGoals: string[];
  criticalKPIs: TaskDefinitionKPI[];
}

// Zod schema for form validation
export const taskDefinitionSchema = z.object({
  mission: z
    .string()
    .trim()
    .min(10, "核心使命為必填項，且需至少 10 個字元。")
    .max(500, "核心使命不可超過 500 個字元。"),
  hardConstraints: z.array(
    z.string().trim().min(5, "每條約束至少 5 個字元。").max(200, "每條約束不可超過 200 個字元。")
  ),
  softObjectives: z.array(
    z.string().trim().min(5, "每條目標至少 5 個字元。").max(200, "每條目標不可超過 200 個字元。")
  ),
  nonGoals: z.array(
    z.string().trim().min(5, "每條非目標至少 5 個字元。").max(200, "每條非目標不可超過 200 個字元。")
  ),
  criticalKPIs: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(3, "指標名稱至少 3 個字元。"),
        target: z.string().trim().min(1, "目標值為必填。"),
        method: z.string().trim().min(1, "衡量方式為必填。"),
      })
    )
    .min(1, "請至少定義一個關鍵指標。"),
});

export type TaskDefinitionFormValues = z.infer<typeof taskDefinitionSchema>;
