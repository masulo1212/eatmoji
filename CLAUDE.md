# CLAUDE.md

本文件為 Claude Code (claude.ai/code) 在此代碼庫中工作時提供指導。

**重要：所有回應都應使用中文。**

## 專案概述

這是一個名為 "eatmoji" 的 Cloudflare Worker 專案，使用以下技術：

- **Hono** 作為網頁框架
- **Chanfana** 用於 OpenAPI 3.1 自動生成和驗證
- **D1 資料庫** 用於資料存儲
- **Vitest** 配合 Cloudflare Workers 池進行測試

## 開發指令

### 本地開發

```bash
pnpm dev                    # 啟動本地開發伺服器（會先初始化資料庫）
pnpm seedLocalDb           # 在本地應用 D1 資料庫遷移
```

### 測試

```bash
pnpm test                  # 運行完整測試套件（dry-run 部署 + 測試）
pnpm test:dev              # 針對開發環境運行測試
pnpm test:prod             # 針對生產環境運行測試
```

### 結構描述和類型

```bash
pnpm cf-typegen           # 生成 Cloudflare 類型定義
pnpm schema               # 在本地提取 OpenAPI 結構描述（npx chanfana）
```

### 部署

```bash
pnpm deploy:dev           # 部署到開發環境
pnpm deploy:prod          # 部署到生產環境
pnpm predeploy            # 應用遠端 D1 資料庫遷移（部署前執行）
```

## 架構

### 程式進入點

- `src/index.ts` - 主要的 Hono 應用程式，包含全域錯誤處理和 OpenAPI 設定

### 路由結構

- 端點組織在 `src/endpoints/` 目錄中
- 子路由器如 `tasksRouter` 定義在各自的模組中
- 每個端點都遵循 chanfana 模式以符合 OpenAPI 規範

### 資料庫

- D1 資料庫綁定名稱為 "DB"
- 遷移檔案位於 `migrations/` 目錄
- 資料庫 ID 設定在 `wrangler.jsonc` 中

### 測試設定

- 整合測試位於 `tests/` 目錄
- 使用 Vitest 配合 `@cloudflare/vitest-pool-workers`
- 測試設定透過 `tests/apply-migrations.ts` 自動應用遷移
- 設定檔為 `tests/vitest.config.mts`

### 環境設定

- 開發/生產環境定義在 `wrangler.jsonc`
- 使用 `NODE_ENV` 變數區分環境
- OpenAPI 文件僅在開發環境中提供（`IS_DEV` 檢查）

### 重要檔案

- `src/types.ts` - 共享的類型定義
- `src/utils/utils.ts` - 工具函數，包括環境上下文
- `worker-configuration.d.ts` - 類型定義（大型檔案）

## Claude Code 使用說明

### 語言要求

Claude Code 在此專案中必須：

- **全部使用中文回應** - 包括錯誤訊息、說明、程式碼註解等
- 遵循台灣繁體中文用語習慣
- 技術術語可保留英文，但說明文字必須為中文

### 互動方式

- 保持簡潔明確的回應
- 直接回答問題，避免冗長的解釋
- 必要時提供程式碼範例和檔案位置參考
