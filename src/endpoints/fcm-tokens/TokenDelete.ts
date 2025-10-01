import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入分層架構
import { FcmTokenController } from "../../controllers/fcmTokenController";
import { FirestoreFcmTokenRepository } from "../../repositories/fcmTokenRepository";
import { FcmTokenService } from "../../services/fcmTokenService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * TokenDelete endpoint - 刪除特定設備的 FCM Token
 * 對應 Flutter 的 removeCurrentDeviceToken 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class TokenDelete extends OpenAPIRoute {
  public schema = {
    tags: ["FCM Tokens"],
    summary: "刪除特定設備的 FCM Token",
    description: "根據設備 ID 刪除特定設備的 FCM Token，用於使用者登出或停用通知時",
    operationId: "deleteFcmToken",
    request: {
      params: z.object({
        deviceId: z
          .string()
          .min(1, "設備 ID 不能為空")
          .describe("要刪除的設備 ID"),
      }),
    },
    responses: {
      "200": {
        description: "FCM Token 刪除成功",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.undefined().optional(),
            }).openapi({
              description: "刪除成功響應",
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

      // 獲取路徑參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { deviceId } = data.params;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const fcmTokenRepository = new FirestoreFcmTokenRepository(firestore);
      const fcmTokenService = new FcmTokenService(fcmTokenRepository);
      const fcmTokenController = new FcmTokenController(fcmTokenService);

      // 調用 Controller 層處理業務邏輯
      const response = await fcmTokenController.removeDeviceToken(userId, deviceId);

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode: 400 | 401 | 500 = 400; // 預設為請求錯誤
        
        // 根據錯誤訊息判斷狀態碼
        if (response.error?.includes("使用者 ID")) {
          statusCode = 401;
        } else if (response.error?.includes("不能為空")) {
          statusCode = 400;
        } else {
          statusCode = 500;
        }

        return c.json(
          FcmTokenController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
      });
    } catch (error) {
      console.error("Endpoint: TokenDelete 處理錯誤:", error);

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

      // 處理路徑參數錯誤
      if (error instanceof Error && error.message.includes("deviceId")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Invalid device ID parameter" }],
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