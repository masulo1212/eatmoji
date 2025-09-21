# CLAUDE.md

本文件為 Claude Code (claude.ai/code) 在此代碼庫中工作時提供指導。

**重要：所有回應都應使用中文。**

## 專案概述

這是一個名為 "eatmoji" 的 Cloudflare Worker 專案，採用分層架構設計，使用以下技術：

- **Hono** 作為網頁框架
- **Chanfana** 用於 OpenAPI 3.1 自動生成和驗證  
- **Firebase Firestore** 用於資料存儲
- **Firebase Authentication** 用於使用者認證
- **Vitest** 配合 Cloudflare Workers 池進行測試
- **TypeScript** 提供完整型別安全

## 開發指令

### 本地開發
```bash
pnpm dev                    # 啟動本地開發伺服器
pnpm cf-typegen            # 生成 Cloudflare 類型定義
```

### 測試
```bash
pnpm test                  # 運行完整測試套件（dry-run 部署 + 測試）
pnpm test:dev              # 針對開發環境運行測試
pnpm test:prod             # 針對生產環境運行測試
```

### OpenAPI 結構描述
```bash
pnpm schema               # 在本地提取 OpenAPI 結構描述（npx chanfana）
```

### 部署
```bash
pnpm deploy:dev           # 部署到開發環境
pnpm deploy:prod          # 部署到生產環境
```

## 分層架構

本專案採用五層架構設計，實現關注點分離和高可維護性：

### 1. Endpoint 層 (`src/endpoints/`)
- **職責**: OpenAPI schema 定義、HTTP 請求/響應處理
- **檔案**: `DiariesList.ts`, `router.ts`
- **功能**: 依賴注入協調、chanfana 整合、路由定義

### 2. Middleware 層 (`src/middleware/`)
- **職責**: 橫切關注點處理（認證、授權、日誌等）
- **檔案**: `auth.ts`
- **功能**: Firebase ID token 驗證、使用者身份提取、上下文設定

### 3. Controller 層 (`src/controllers/`)
- **職責**: HTTP 邏輯處理、請求參數驗證、響應格式化
- **檔案**: `diaryController.ts`
- **功能**: Service 層調用、統一 API 響應格式、錯誤處理

### 4. Service 層 (`src/services/`)
- **職責**: 業務邏輯實作、業務規則驗證、資料處理協調
- **檔案**: `diaryService.ts`, `authService.ts`
- **功能**: 複雜業務邏輯、資料驗證、Repository 層協調

### 5. Repository 層 (`src/repositories/`)
- **職責**: 資料存取、Firebase Firestore 操作、資料轉換
- **檔案**: `diaryRepository.ts`
- **功能**: CRUD 操作、查詢邏輯、資料模型轉換

## 完整資料流程

當用戶調用 API 時的完整流程（以 `GET /diaries` 為例）：

1. **HTTP 請求進入** → `src/index.ts` (Hono 主應用)
2. **路由分派** → `src/endpoints/diaries/router.ts`
3. **認證驗證** → `src/middleware/auth.ts` (Firebase ID token 驗證)
4. **請求處理** → `src/endpoints/diaries/DiariesList.ts` (OpenAPI + HTTP 邏輯)
5. **依賴注入** → 初始化: Firestore → Repository → Service → Controller
6. **請求格式化** → `src/controllers/diaryController.ts` (參數驗證 + 響應格式化)
7. **業務邏輯** → `src/services/diaryService.ts` (業務規則 + 驗證)
8. **資料存取** → `src/repositories/diaryRepository.ts` (Firebase Firestore 操作)
9. **響應回傳** → 透過各層級回傳標準化 JSON 響應

## 目錄結構

```
src/
├── controllers/          # HTTP 處理層
│   └── diaryController.ts
├── services/            # 業務邏輯層
│   ├── diaryService.ts
│   └── authService.ts
├── repositories/        # 資料存取層
│   └── diaryRepository.ts
├── middleware/          # 中間件層
│   └── auth.ts
├── endpoints/           # API 端點層
│   ├── diaries/
│   │   ├── router.ts
│   │   └── DiariesList.ts
│   └── tasks/
├── types/              # 型別定義
│   └── diary.ts
├── utils/              # 工具函數
│   ├── firebase.ts
│   └── utils.ts
├── types.ts            # 共享型別
└── index.ts            # 應用程式進入點
```

## Firebase 整合

### 環境變數配置

在 `wrangler.jsonc` 中配置：
```json
{
  "env": {
    "dev": {
      "vars": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "FIREBASE_CLIENT_EMAIL": "service-account-email"
      }
    }
  }
}
```

### 本地開發配置

建立 `.dev.vars` 檔案：
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Firebase 服務

- **Authentication**: 使用 Firebase ID token 進行使用者認證
- **Firestore**: 主要資料存儲，使用 `firebase-rest-firestore` 套件
- **初始化**: 透過 `src/utils/firebase.ts` 統一管理

## 型別系統

### 核心型別定義 (`src/types/diary.ts`)
- `Diary` interface - 主要資料模型
- `TaskStatus` enum - 任務狀態列舉
- `HealthAssessment`, `Ingredient` - 相關資料結構
- Zod schemas - 資料驗證和 OpenAPI 生成
- Firestore timestamp 轉換工具

### API 響應格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  result?: T;
  error?: string;
}
```

## 開發指導原則

### 新增功能流程
1. **定義資料模型** → 在 `src/types/` 建立 interface 和 Zod schema
2. **實作 Repository** → 在 `src/repositories/` 新增資料存取方法
3. **實作 Service** → 在 `src/services/` 新增業務邏輯
4. **實作 Controller** → 在 `src/controllers/` 新增 HTTP 處理
5. **建立 Endpoint** → 在 `src/endpoints/` 新增 API 定義
6. **註冊路由** → 在 router 中註冊新端點

### 依賴注入模式
```typescript
// 在 Endpoint 中初始化完整依賴鏈
const firestore = getFirestoreFromContext(c);
const repository = new DiaryRepository(firestore);
const service = new DiaryService(repository);
const controller = new DiaryController(service);
```

### 錯誤處理
- Repository 層：拋出技術性錯誤
- Service 層：處理業務邏輯錯誤
- Controller 層：格式化 HTTP 錯誤響應
- Endpoint 層：處理認證和 HTTP 層級錯誤

### 測試策略
- 單元測試：各層級獨立測試
- 整合測試：完整 API 流程測試
- Mock：使用 interface 進行依賴注入和測試隔離

## 重要檔案

- `src/index.ts` - Hono 應用程式主進入點，包含全域錯誤處理
- `src/types.ts` - 共享型別定義，包含 AppContext
- `src/types/diary.ts` - 完整的 Diary 資料模型和驗證 schema
- `src/utils/firebase.ts` - Firebase Firestore 初始化和工具函數
- `worker-configuration.d.ts` - Cloudflare Workers 型別定義
- `wrangler.jsonc` - Cloudflare 環境配置和 Firebase 環境變數

## Claude Code 使用說明

### 語言要求

Claude Code 在此專案中必須：

- **全部使用中文回應** - 包括錯誤訊息、說明、程式碼註解等
- 遵循台灣繁體中文用語習慣
- 技術術語可保留英文，但說明文字必須為中文

### 開發方針

- **遵循分層架構** - 新功能必須按照五層架構模式開發
- **型別安全優先** - 使用 TypeScript 和 Zod 確保型別安全
- **依賴注入** - 使用 interface 和依賴注入模式提升可測試性
- **錯誤處理** - 實作完整的錯誤處理機制
- **Firebase 整合** - 所有資料操作透過 Firebase 進行

### 互動方式

- 保持簡潔明確的回應
- 直接回答問題，避免冗長的解釋
- 提供具體的檔案位置參考（如：`src/controllers/diaryController.ts:48`）
- 遵循現有的架構模式和程式碼風格
- 優先修改現有檔案而非建立新檔案（除非確實需要）