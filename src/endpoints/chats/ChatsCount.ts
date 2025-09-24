import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { NumberResponseSchema } from "../../types/chat";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatsCount endpoint - 獲取聊天記錄總數
 * 對應 Flutter 的 getTotalChatCount() 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatsCount extends OpenAPIRoute {
  public schema = {
    tags: ["Chats"],
    summary: "獲取聊天記錄總數",
    description: "獲取已驗證使用者的聊天記錄總數，對應 Dart getTotalChatCount() 方法",
    operationId: "chatsCount",
    request: {
      // 這個端點不需要任何請求參數，只需要認證
    },
    responses: {
      "200": {
        description: "成功獲取聊天記錄總數",
        content: {
          "application/json": {
            schema: NumberResponseSchema.openapi({
              description: "聊天記錄總數回應",
              example: {
                success: true,
                result: 15
              }
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
      const chatRepository = new FirestoreChatRepository(firestore);
      const chatService = new ChatService(chatRepository);
      const chatController = new ChatController(chatService);

      // 調用 Controller 層處理業務邏輯
      const response = await chatController.getTotalChatCount(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          ChatController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: ChatsCount 處理錯誤:", error);

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