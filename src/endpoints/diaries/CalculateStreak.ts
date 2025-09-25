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
 * CalculateStreak endpoint - 計算使用者的連續打卡天數
 * 對應 Flutter 的 calculateStreak 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class CalculateStreak extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "計算使用者的連續打卡天數",
    description: "根據使用者的 diary 記錄計算連續打卡天數，實現與 Flutter 相同的邏輯",
    operationId: "calculateStreak",
    request: {},
    responses: {
      "200": {
        description: "成功計算連續打卡天數",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.number().describe("連續打卡天數")
            }).openapi({
              description: "連續打卡天數回應",
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

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理業務邏輯
      const response = await diaryController.calculateStreak(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          DiaryController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: CalculateStreak 處理錯誤:", error);

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