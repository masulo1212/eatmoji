import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { FcmTokenListResponseSchema } from "../../types/fcmToken";

// 導入分層架構
import { FcmTokenController } from "../../controllers/fcmTokenController";
import { FirestoreFcmTokenRepository } from "../../repositories/fcmTokenRepository";
import { FcmTokenService } from "../../services/fcmTokenService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * TokensList endpoint - 獲取使用者所有的 FCM Token
 * 對應 Flutter 的 getUserTokens 靜態方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class TokensList extends OpenAPIRoute {
  public schema = {
    tags: ["FCM Tokens"],
    summary: "獲取使用者所有的 FCM Token",
    description: "獲取已驗證使用者的所有 FCM Token 列表，按最後活躍時間倒序排列",
    operationId: "getUserFcmTokens",
    responses: {
      "200": {
        description: "成功獲取 FCM Token 列表",
        content: {
          "application/json": {
            schema: FcmTokenListResponseSchema.openapi({
              description: "FCM Token 列表回應",
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
      const fcmTokenRepository = new FirestoreFcmTokenRepository(firestore);
      const fcmTokenService = new FcmTokenService(fcmTokenRepository);
      const fcmTokenController = new FcmTokenController(fcmTokenService);

      // 調用 Controller 層處理業務邏輯
      const response = await fcmTokenController.getUserTokens(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("使用者 ID") ? 401 : 500;
        return c.json(
          FcmTokenController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: TokensList 處理錯誤:", error);

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