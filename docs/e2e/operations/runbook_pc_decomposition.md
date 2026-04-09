# Runbook: PC Decomposition Rollback

> **版本**：1.0 | **日期**：2026-04-09

---

## 何時需要 rollback

- PC decomposition 導致生產環境 contradictions 表資料異常
- `decompose_tc_to_pcs` 持續回傳錯誤或低品質 PCs
- Migration 009 欄位造成前端渲染異常

---

## 1. 前端停用（最快生效）

在 `src/components/explore/ContradictionTab.tsx` 的 `maybeAutoDecomposeTC` 函數頂部加 early return：

```ts
async function maybeAutoDecomposeTC(/* ... */) {
  return; // EMERGENCY STOP: PC decompose disabled — see runbook_pc_decomposition.md
  // ... rest of the function
}
```

重新部署前端。

---

## 2. 後端停用

在 `backend/app/agents/analyst.py` 的 `decompose_tc_to_pcs` 函數頂部加 early return：

```python
def decompose_tc_to_pcs(req):
    # EMERGENCY STOP: PC decompose disabled — see runbook_pc_decomposition.md
    return ContradictionDecomposeResponse(
        triggered=False,
        trigger_reason="PC decompose temporarily disabled (rollback)",
        decomposed_pcs=[],
        reasoning="See runbook_pc_decomposition.md",
    )
```

---

## 3. 清理已產生的子 PC 資料

```sql
-- 確認有多少子 PC
SELECT count(*) FROM contradictions WHERE parent_contradiction_id IS NOT NULL;

-- 刪除所有子 PC（不影響父 TC，FK cascade 反向安全）
DELETE FROM contradictions WHERE parent_contradiction_id IS NOT NULL;

-- 驗證
SELECT count(*) FROM contradictions WHERE parent_contradiction_id IS NOT NULL;
-- 預期：0
```

---

## 4. DB migration rollback（最後手段）

```sql
-- 移除新增的欄位和索引
DROP INDEX IF EXISTS idx_contradictions_parent;
ALTER TABLE contradictions DROP COLUMN IF EXISTS parent_contradiction_id;
ALTER TABLE contradictions DROP COLUMN IF EXISTS derived_parameter;
ALTER TABLE contradictions DROP COLUMN IF EXISTS subsystem_hint;
ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_principle_id;
ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_category;
ALTER TABLE contradictions DROP COLUMN IF EXISTS separation_rationale;
ALTER TABLE contradictions DROP COLUMN IF EXISTS pc_attribute_a;
ALTER TABLE contradictions DROP COLUMN IF EXISTS pc_attribute_not_a;
```

**注意**：此操作不可逆，會遺失所有子 PC 資料。僅在確認不需要保留任何 decomposition 結果時執行。

---

## 5. 恢復服務

1. 移除 Step 1 或 Step 2 的 early return
2. 重新部署
3. 驗證 AI 識別 → 自動深挖流程正常
4. 驗證現有矛盾資料未被破壞
