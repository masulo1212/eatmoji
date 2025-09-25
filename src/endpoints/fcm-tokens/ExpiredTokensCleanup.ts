import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { FcmTokenDeleteResponseSchema } from "../../types/fcmToken";

// 導入分層架構
import { FcmTokenController } from "../../controllers/fcmTokenController";
import { FirestoreFcmTokenRepository } from "../../repositories/fcmTokenRepository";
import { FcmTokenService } from "../../services/fcmTokenService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ExpiredTokensCleanup endpoint - 清理過期的 FCM Token
 * 對應 Flutter 的 _cleanupExpiredTokens 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ExpiredTokensCleanup extends OpenAPIRoute {
  public schema = {
    tags: ["FCM Tokens"],
    summary: "清理過期的 FCM Token",
    description: "清理使用者超過指定天數未活躍的 FCM Token，預設為 30 天",
    operationId: "cleanupExpiredFcmTokens",
    request: {
      query: z.object({
        expiredDays: z.coerce
          .number()
          .min(1)
          .max(365)
          .default(30)
          .optional()
          .describe("清理超過幾天未活躍的 Token，預設 30 天"),
      }),
    },
    responses: {
      "200": {
        description: "清理過期 FCM Token 成功",
        content: {
          "application/json": {
            schema: FcmTokenDeleteResponseSchema.openapi({
              description: "清理結果，包含刪除的 Token 數量",
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

      // 獲取查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { expiredDays } = data.query;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const fcmTokenRepository = new FirestoreFcmTokenRepository(firestore);
      const fcmTokenService = new FcmTokenService(fcmTokenRepository);
      const fcmTokenController = new FcmTokenController(fcmTokenService);

      // 調用 Controller 層處理業務邏輯
      const response = await fcmTokenController.cleanupExpiredTokens(
        userId,
        expiredDays?.toString()
      );

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500; // 預設為伺服器錯誤

        // 根據錯誤訊息判斷狀態碼
        if (response.error?.includes("使用者 ID")) {
          statusCode = 401;
        } else if (
          response.error?.includes("必須為") ||
          response.error?.includes("之間")
        ) {
          statusCode = 400;
        }

        return c.json(
          FcmTokenController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應，包含刪除統計
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: ExpiredTokensCleanup 處理錯誤:", error);

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

      // 處理查詢參數錯誤
      if (error instanceof Error && error.message.includes("expiredDays")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Invalid expiredDays parameter" }],
          },
          400
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
