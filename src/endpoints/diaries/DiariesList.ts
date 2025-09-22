import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DiaryListResponseSchema } from "../../types/diary";

// 導入重構後的分層架構
import { DiaryController } from "../../controllers/diaryController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { DiaryService } from "../../services/diaryService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * DiariesList endpoint - 獲取使用者的 diary 列表
 * 對應 Flutter 的 getDiaries 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class DiariesList extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "獲取使用者的 diary 列表",
    description: "獲取已驗證使用者的 diary 列表，支援可選的日期過濾",
    operationId: "getDiaries",
    request: {
      query: z.object({
        // 可選的日期過濾參數，格式：YYYY-MM-DD
        date: z
          .string()
          // .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD")
          .optional()
          .describe("過濾此日期之後的 diary 項目（包含此日期）"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取 diary 列表",
        content: {
          "application/json": {
            schema: DiaryListResponseSchema.openapi({
              description: "Diary 列表回應",
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

      // 獲取查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { date: dateString } = data.query;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理業務邏輯
      // console.log("DiariesList: userId", userId);
      // console.log("DiariesList: dateString", dateString);
      const response = await diaryController.getDiaries(userId, dateString);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("日期格式") ? 400 : 500;
        return c.json(
          DiaryController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: DiariesList 處理錯誤:", error);

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
          401
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500
      );
    }
  }
}
