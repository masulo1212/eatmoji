import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  CreateFcmTokenSchema,
  FcmTokenResponseSchema,
} from "../../types/fcmToken";

// 導入分層架構
import { FcmTokenController } from "../../controllers/fcmTokenController";
import { FirestoreFcmTokenRepository } from "../../repositories/fcmTokenRepository";
import { FcmTokenService } from "../../services/fcmTokenService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * TokenRegister endpoint - 註冊或更新 FCM Token
 * 對應 Flutter 的 _registerTokenToFirestore 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class TokenRegister extends OpenAPIRoute {
  public schema = {
    tags: ["FCM Tokens"],
    summary: "註冊或更新 FCM Token",
    description:
      "註冊新的 FCM Token 或更新現有的 Token 資訊，使用設備 ID 作為唯一識別",
    operationId: "registerFcmToken",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateFcmTokenSchema.openapi({
              description: "FCM Token 註冊資料",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "FCM Token 註冊成功",
        content: {
          "application/json": {
            schema: FcmTokenResponseSchema.openapi({
              description: "FCM Token 註冊結果",
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

      // 獲取請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const tokenRequest = data.body;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const fcmTokenRepository = new FirestoreFcmTokenRepository(firestore);
      const fcmTokenService = new FcmTokenService(fcmTokenRepository);
      const fcmTokenController = new FcmTokenController(fcmTokenService);

      // 調用 Controller 層處理業務邏輯
      const response = await fcmTokenController.registerToken(
        userId,
        tokenRequest
      );

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 400; // 預設為請求錯誤

        // 根據錯誤訊息判斷狀態碼
        if (response.error?.includes("使用者 ID")) {
          statusCode = 401;
        } else if (
          response.error?.includes("不能為空") ||
          response.error?.includes("必須為")
        ) {
          statusCode = 400;
        } else {
          statusCode = 500;
        }

        return c.json(
          FcmTokenController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: TokenRegister 處理錯誤:", error);

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

      // 處理 JSON 解析錯誤
      if (error instanceof Error && error.message.includes("JSON")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Invalid JSON format" }],
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
