import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { CreateDiarySchema, DiaryResponseSchema } from "../../types/diary";

// 導入重構後的分層架構
import { DiaryController } from "../../controllers/diaryController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { DiaryService } from "../../services/diaryService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * DiaryFromRecipe endpoint - 從食譜/食物條目建立 diary
 * 對應 Flutter 的 addDiaryFromFoodEntryAndRecipe 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 完整 Diary 資料驗證
 * - 調用完整的依賴注入鏈
 * - 錯誤響應格式化
 */
export class DiaryFromRecipe extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "從食譜/食物條目建立新 diary",
    description: "建立新的 diary 項目，資料來源為食譜或食物條目",
    operationId: "createDiaryFromRecipe",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateDiarySchema.openapi({
              description: "完整的 Diary 資料",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "成功建立 diary",
        content: {
          "application/json": {
            schema: DiaryResponseSchema.openapi({
              description: "建立的 Diary 回應",
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "401": {
        description: "未授權 - 需要有效的 Firebase ID token",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "500": {
        description: "伺服器錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
    },
    security: [
      {
        Bearer: [],
      },
    ],
  };

  public async handle(c: AppContext) {
    try {
      // 從認證中間件獲取使用者 ID
      const userId = requireUserIdFromMiddleware(c);

      // 獲取原始請求資料（不進行驗證）
      const rawBody = await c.req.json();
      
      // 預處理資料：將 null 值轉換為 undefined
      const processedBody = this.convertNullToUndefined(rawBody);

      // 使用 CreateDiarySchema 驗證處理後的資料
      const diaryData = CreateDiarySchema.parse(processedBody);

      // 初始化完整的依賴注入鏈
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理 diary 建立
      const response = await diaryController.createDiary(userId, diaryData);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 根據錯誤類型決定狀態碼
        let statusCode = 500;
        if (
          response.error?.includes("驗證") ||
          response.error?.includes("格式") ||
          response.error?.includes("不能為空")
        ) {
          statusCode = 400;
        }

        return c.json(
          DiaryController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json(
        {
          success: true,
          result: response.result,
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: DiaryFromRecipe 處理錯誤:", error);

      // 處理 Zod 驗證錯誤
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as any;
        const errorMessages = zodError.issues.map((issue: any) => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: `資料驗證失敗: ${errorMessages}` }],
          },
          400 as any
        );
      }

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message ===
          "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json(
          {
            success: false,
            errors: [{ code: 401, message: "Authentication required" }],
          },
          401 as any
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500 as any
      );
    }
  }

  /**
   * 遞迴地將物件中的 null 值轉換為 undefined
   * 這樣可以讓前端傳來的 null 值通過 Zod optional() 驗證
   */
  private convertNullToUndefined(obj: any): any {
    if (obj === null) {
      return undefined;
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertNullToUndefined(item));
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.convertNullToUndefined(value);
    }
    
    return result;
  }
}