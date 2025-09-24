import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { ChatMessageListResponseSchema } from "../../types/chat";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatMessages endpoint - 獲取指定聊天的所有訊息
 * 對應 Flutter 的 getChatMessages(String chatId) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatMessages extends OpenAPIRoute {
  public schema = {
    tags: ["Chat Messages"],
    summary: "獲取指定聊天的所有訊息",
    description: "獲取指定聊天ID的所有訊息，按時間順序排列，對應 Dart getChatMessages(String chatId) 方法",
    operationId: "chatMessages",
    request: {
      params: z.object({
        chatId: z
          .string()
          .min(1, "聊天 ID 不能為空")
          .describe("聊天記錄的唯一識別符"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取聊天訊息列表",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.array(z.object({
                content: z.string().describe("訊息內容"),
                role: z.string().describe("訊息角色 (user/assistant/system)"),
                createdAt: z.string().describe("創建時間 (ISO 格式)"),
                chatId: z.string().optional().describe("所屬聊天 ID"),
                messageId: z.string().optional().describe("訊息唯一識別符"),
              })).describe("聊天訊息列表"),
              error: z.string().optional(),
            }).openapi({
              description: "聊天訊息列表回應",
              example: {
                success: true,
                result: [
                  {
                    content: "你好，我想要查看我的健康報告",
                    role: "user",
                    createdAt: "2024-01-01T10:00:00.000Z",
                    chatId: "chat_12345",
                    messageId: "msg_001"
                  },
                  {
                    content: "根據您的數據，這是您的健康分析報告...",
                    role: "assistant",
                    createdAt: "2024-01-01T10:01:00.000Z",
                    chatId: "chat_12345",
                    messageId: "msg_002"
                  }
                ]
              }
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
        description: "聊天記錄不存在或無權限訪問",
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

      // 獲取並驗證路徑參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { chatId } = data.params;

      // 基本參數驗證
      if (!chatId || chatId.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "聊天 ID 不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const chatRepository = new FirestoreChatRepository(firestore);
      const chatService = new ChatService(chatRepository);
      const chatController = new ChatController(chatService);

      // 調用 Controller 層處理業務邏輯
      const response = await chatController.getChatMessages(userId, chatId);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型
        let statusCode = 500;
        if (response.error?.includes("找不到") || response.error?.includes("沒有權限")) {
          statusCode = 404;
        } else if (response.error?.includes("不能為空") || response.error?.includes("無效")) {
          statusCode = 400;
        }

        return c.json(
          ChatController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: ChatMessages 處理錯誤:", error);

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

      // 處理參數驗證錯誤
      if (error instanceof Error && error.message.includes("validation")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "聊天 ID 格式錯誤" }],
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