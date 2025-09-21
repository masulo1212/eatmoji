import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入重構後的分層架構
import { DiaryController } from "../../controllers/diaryController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { DiaryService } from "../../services/diaryService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * DiaryDelete endpoint - 軟刪除 diary
 * 對應 Flutter 的 deleteDiary 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class DiaryDelete extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "刪除 diary（軟刪除）",
    description: "軟刪除指定 ID 的 diary 項目，設定 isDeleted 為 true 並記錄 deletedAt 時間戳",
    operationId: "deleteDiary",
    request: {
      params: z.object({
        id: z.string().describe("要刪除的 Diary ID"),
      }),
    },
    responses: {
      "200": {
        description: "成功刪除 diary",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              message: z.string().optional(),
            }).openapi({
              description: "刪除成功回應",
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
      "404": {
        description: "找不到指定的 diary 或無權限存取",
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

      // 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const { id: diaryId } = data.params;

      // 基本參數驗證
      if (!diaryId || diaryId.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Diary ID 不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理業務邏輯
      const response = await diaryController.deleteDiary(userId, diaryId);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 根據錯誤類型決定狀態碼
        let statusCode = 500;
        if (
          response.error?.includes("找不到") ||
          response.error?.includes("沒有權限")
        ) {
          statusCode = 404;
        } else if (
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
      return c.json({
        success: true,
        message: "Diary 已成功刪除",
      });
    } catch (error) {
      console.error("Endpoint: DiaryDelete 處理錯誤:", error);

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
}