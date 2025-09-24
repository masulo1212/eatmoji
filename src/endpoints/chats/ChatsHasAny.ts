import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { BooleanResponseSchema } from "../../types/chat";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatsHasAny endpoint - 檢查使用者是否有任何聊天記錄
 * 對應 Flutter 的 hasAnyChats() 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatsHasAny extends OpenAPIRoute {
  public schema = {
    tags: ["Chats"],
    summary: "檢查使用者是否有任何聊天記錄",
    description: "檢查已驗證使用者是否有任何聊天記錄，對應 Dart hasAnyChats() 方法",
    operationId: "chatsHasAny",
    request: {
      // 這個端點不需要任何請求參數，只需要認證
    },
    responses: {
      "200": {
        description: "成功檢查聊天記錄狀態",
        content: {
          "application/json": {
            schema: BooleanResponseSchema.openapi({
              description: "是否有聊天記錄的布林回應",
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
      const response = await chatController.hasAnyChats(userId);

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
      console.error("Endpoint: ChatsHasAny 處理錯誤:", error);

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