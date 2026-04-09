# E2E 手測腳本：Explore PC Decomposition

> **版本**：1.0 | **日期**：2026-04-09
> **前置**：本地 backend + frontend + Supabase 均啟動

---

## 測試情境：e-Bike 驅動單元

### 準備 Brief

在 Explore 頁面建立一個新專案，Brief 內容包含：
- **核心設計使命**：設計一個 e-Bike 驅動單元
- **關鍵規格**：扭矩 125 Nm / 重量 ≤ 2500 g / 外徑 ≤ 111 mm / 軸向長度 ≤ 92 mm / 噪聲 ≤ 60 dBA
- **目標**：多速齒輪傳動系統，內部行星齒輪 + 外殼結構 + 散熱路徑

### Step 1：AI 識別矛盾

1. 進入 Explore 頁面的矛盾識別 Tab
2. 點擊「AI 識別」或類似按鈕
3. 確認 AI 回傳的矛盾類型為 **TC**（improving_param 與 worsening_param 應各有值）

**預期**：AI 識別完成後，系統自動在背景呼叫 `/contradictions/{cid}/decompose` API

### Step 2：驗證自動深挖結果

1. 等待 toast 提示「已自動深挖出 N 個物理矛盾」（N ≥ 2）
2. 重新整理頁面
3. 在矛盾列表中，確認父 TC 下方出現多個子 PC 卡片

**驗證清單**：
- [ ] 子 PC 數量 ≥ 3（對 e-Bike 案例，預期：齒輪傳動 / 外殼結構 / 齒輪接觸面積 或類似）
- [ ] 每個子 PC 有 `derived_parameter`（非空）
- [ ] 每個子 PC 有 `subsystem_hint`（非空，對應不同子系統）
- [ ] 每個子 PC 的 `separation_principle_id` 在 16 項 canonical 清單內
- [ ] `separation_category` 至少涵蓋 2 種不同類別（例：space + condition）
- [ ] 低信心（confidence < 0.5）的子 PC 顯示警告 icon

### Step 3：驗證 DB 持久化

1. 直接查詢 Supabase `contradictions` 表
2. 確認子 PC 列的 `parent_contradiction_id` = 父 TC 的 `id`
3. 確認 `separation_principle_id`, `separation_category`, `separation_rationale`, `derived_parameter`, `subsystem_hint` 欄位均有值

```sql
SELECT id, type, parent_contradiction_id, derived_parameter, subsystem_hint,
       separation_principle_id, separation_category
FROM contradictions
WHERE project_id = '<your_project_id>'
ORDER BY parent_contradiction_id NULLS FIRST, created_at;
```

### Step 4：驗證 Cascade 刪除

1. 在 UI 或直接 DB 刪除父 TC
2. 確認所有子 PC 已自動被 FK CASCADE 移除

```sql
SELECT count(*) FROM contradictions WHERE parent_contradiction_id = '<deleted_tc_id>';
-- 預期：0
```

### Step 5：驗證防重入

1. 對同一個已有子 PC 的父 TC，重新觸發 AI 識別
2. 確認不會再次產生新的子 PC（console 應出現 `[pc-decompose] parent has children, skipping`）

### Step 6（Phase 9.1 延伸）：驗證 Create 頁 hint-path

1. 進入 Create 頁面
2. 對子 PC 觸發 TRIZ 求解
3. 確認求解請求帶有 `separation_principle_id` 等 hint 欄位
4. 確認回傳的 suggestions 的 `separation_principle` 與 hint 一致（若不一致，console 應有 delta log）

---

## 已知限制

- L3 (SF) 尚未實作（deferred to L3 WBS），CLD 目前仍消費所有矛盾文字
- Create 頁分層 solve（Phase 9.2）尚未實作，Step 6 可能需要手動帶 hint 欄位
- Phase B adoption 的同父跨層不互斥檢查（Phase 9.6）尚未驗證
