# Schema Codegen Workflow

> **目的**：讓 `backend/app/models/schemas.py` 的 Pydantic 模型成為 single source of truth，FE TypeScript 型別自動同步。
>
> **狀態**：Stage 1 of `refactor/subsystem-interface-contracts` — 目前 `src/types/generated/subsystem.ts` 是手工對照 Python schema 維護的「pre-codegen」版本。Stage 1 完成後，下一步是把 codegen 工具鏈接上。

---

## 為什麼需要 codegen

過去三個月內 BE schema 改了 4 次（spatial 擴充、AliasChoices 雙別名、欄位新增、casing 修正），每次都要手動同步至少 4 個 FE 檔案：

- `src/types/create.ts`
- `src/types/artifact.ts`
- `src/lib/api.ts`
- `src/hooks/api/useCreate.ts`

漏掉任何一個，type system 就騙人，runtime 就會出意外。**這是過去三個月內 80% 的 type-related bug 的根因**。

Codegen 把這個問題從「人類紀律」變成「工具問題」：BE 改 schema → 跑一次 script → FE type 自動更新 → TypeScript 編譯失敗點就是要修的地方。

---

## 推薦工具：pydantic2ts

- **GitHub**：<https://github.com/phillipdupuis/pydantic-to-typescript>
- **原理**：呼叫 Pydantic v2 的 `.model_json_schema()` 產出 JSON Schema，再用 `json-schema-to-typescript` 轉成 `.ts`
- **依賴**：Python (`pip install pydantic-to-typescript`) + Node (`npm install -g json-schema-to-typescript`)
- **執行時間**：< 1 秒

### 安裝

```bash
# 後端虛擬環境裡
pip install pydantic-to-typescript

# 系統 Node 環境
npm install -g json-schema-to-typescript
```

### 執行

```bash
# 從 repo 根目錄
pydantic2ts \
  --module backend/app/models/schemas.py \
  --output src/types/generated/schemas.ts
```

或包成 npm script：

```jsonc
// package.json
{
  "scripts": {
    "codegen": "pydantic2ts --module backend/app/models/schemas.py --output src/types/generated/schemas.ts"
  }
}
```

然後：

```bash
pnpm codegen
```

---

## 工作流程

### 變更 schema 時

```
1. 改 backend/app/models/schemas.py
2. 跑 pnpm codegen
3. 看 TypeScript 編譯錯在哪些 FE 檔案
4. 一一修正
5. commit 同時包含 BE schema + 重新生成的 .ts + FE 修正
```

### Pre-commit hook（建議）

加入 `.husky/pre-commit` 或 `lefthook.yml`：

```yaml
pre-commit:
  commands:
    schema-sync:
      glob: "backend/app/models/schemas.py"
      run: |
        pnpm codegen
        if ! git diff --quiet src/types/generated/; then
          echo "ERROR: schemas.py changed but generated TS is stale."
          echo "Run 'pnpm codegen' and commit the result."
          exit 1
        fi
```

這樣只要 schema 改了 generated TS 沒同步，commit 會被擋。

### CI（建議）

GitHub Actions step：

```yaml
- name: Verify generated types are in sync
  run: |
    pnpm codegen
    git diff --exit-code src/types/generated/
```

---

## 命名約定

`pydantic2ts` 的預設行為：
- Python 欄位名 `loadPath` → TS 欄位名 `loadPath`（保留原名）
- Python 欄位名 `mass_g` → TS 欄位名 `mass_g`（保留原名）
- Python `Optional[X]` → TS `X | null`
- Python `dict[str, X]` → TS `Record<string, X>`

**InterfaceContract 的 6 維是 camelCase**（這是 wire format 規範，見 `Forward_Subsystem_Discovery_Architecture.md` §6.5），**SpatialEstimate / BBox 是 snake_case**（與舊 reference library JSON 一致）。混用是刻意的，不要修。

---

## Stage 1 的暫時狀態

目前 `src/types/generated/subsystem.ts` 是**手工維護**的 placeholder，不是自動生成。它對應 `backend/app/models/schemas.py` 的以下 class：

| Pydantic class | TS interface |
|---|---|
| `BBox` | `BBox` |
| `SpatialEstimate` | `SpatialEstimate` |
| `InterfaceContract` | `InterfaceContract` |
| `PackageNode` | `PackageNode` |
| `RequiredEnvelope` | `RequiredEnvelope` |
| `PackageMap` | `PackageMap` |
| `SuggestedSubsystem` | `SuggestedSubsystem` |
| `SubsystemSuggestResponse` | `SubsystemSuggestResponse` |

當 codegen 工具裝好後，這個檔案會被 `pydantic2ts` 覆寫成自動生成版本，命名空間應該保持一致。**任何手動編輯這個檔案的 PR 都應該被擋下並要求改 schema.py + 重跑 codegen**。

---

## 為什麼不直接用 OpenAPI

考慮過用 FastAPI 自帶的 OpenAPI spec + `openapi-typescript`，但有兩個 trade-off：

1. **OpenAPI 包含整個 API surface**，產出的 TS 檔比只跑 schema 大 5-10 倍，編譯時間明顯變慢
2. **OpenAPI 的型別表達比 JSON Schema 麻煩**，例如 `dict[str, InterfaceContract]` 在 OpenAPI 是 `additionalProperties`，產出的 TS 不如 `Record<string, InterfaceContract>` 直觀

如果未來需要 client SDK（不只 type），再切到 `openapi-typescript-codegen` 是更好的選擇。

---

## TODO（後續 stage）

- [ ] Stage 1.5：實際安裝 pydantic2ts 並把 `src/types/generated/subsystem.ts` 改成自動生成
- [ ] Stage 1.6：把 `src/types/artifact.ts` 的 alternative-flow 6 維契約也納入 generated（與 subsystem 共用）
- [ ] Stage 1.7：把 `src/types/create.ts` 其他與 BE schema 對應的 type（Subsystem、ScamperVariant 等）也納入 generated
- [ ] CI step + pre-commit hook
