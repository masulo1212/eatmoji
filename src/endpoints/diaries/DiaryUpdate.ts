import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DiarySchema, DiaryResponseSchema } from "../../types/diary";

// 導入重構後的分層架構
import { DiaryController } from "../../controllers/diaryController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { DiaryService } from "../../services/diaryService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * DiaryUpdate endpoint - 更新現有的 diary
 * 對應 Flutter 的 updateDiary 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class DiaryUpdate extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "更新現有的 diary",
    description: "更新指定 ID 的 diary 項目，自動設定 updatedAt 時間戳",
    operationId: "updateDiary",
    request: {
      params: z.object({
        id: z.string().describe("要更新的 Diary ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: DiarySchema.partial().openapi({
              description: "更新 Diary 的資料",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功更新 diary",
        content: {
          "application/json": {
            schema: DiaryResponseSchema.openapi({
              description: "更新後的 Diary 回應",
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
      console.log("data", data);
      const { id: diaryId } = data.params;
      const updates = data.body;

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

      if (!updates || Object.keys(updates).length === 0) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "更新資料不能為空" }],
          },
          400
        );
      }

      // 簡單的手動過濾 null 值
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined)
      );

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理業務邏輯
      const response = await diaryController.updateDiary(
        userId,
        diaryId,
        filteredUpdates
      );

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
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: DiaryUpdate 處理錯誤:", error);

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
