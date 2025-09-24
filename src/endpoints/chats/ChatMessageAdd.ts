import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { CreateChatMessageSchema } from "../../types/chat";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatMessageAdd endpoint - 發送訊息到指定聊天
 * 對應 Flutter 的 sendMessage(ChatMessage msg) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatMessageAdd extends OpenAPIRoute {
  public schema = {
    tags: ["Chat Messages"],
    summary: "發送訊息到指定聊天",
    description: "向指定的聊天記錄發送新訊息，對應 Dart sendMessage(ChatMessage msg) 方法",
    operationId: "chatMessageAdd",
    request: {
      params: z.object({
        chatId: z
          .string()
          .min(1, "聊天 ID 不能為空")
          .describe("聊天記錄的唯一識別符"),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateChatMessageSchema.extend({
              chatId: z.string().optional().describe("聊天 ID（將從路徑參數覆蓋）"),
              messageId: z.string().optional().describe("訊息唯一識別符（可選，留空則自動生成）"),
            }).openapi({
              description: "聊天訊息資料",
              example: {
                content: "請幫我分析一下我的健康狀況",
                role: "user",
                messageId: "msg_user_001"
              }
            }),
          },
        },
        required: true,
      },
    },
    responses: {
      "201": {
        description: "成功發送訊息",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.null().optional(),
              message: z.string().optional().default("訊息發送成功"),
            }).openapi({
              description: "訊息發送成功回應",
              example: {
                success: true,
                message: "訊息發送成功"
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

      // 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const { chatId } = data.params;
      const messageData = data.body;

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

      if (!messageData.content || messageData.content.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "訊息內容不能為空" }],
          },
          400
        );
      }

      if (!messageData.role || messageData.role.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "訊息角色不能為空" }],
          },
          400
        );
      }

      // 驗證角色欄位
      const validRoles = ["user", "assistant", "system"];
      if (!validRoles.includes(messageData.role.toLowerCase())) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: `無效的訊息角色: ${messageData.role}，必須是 ${validRoles.join(", ")} 之一` }],
          },
          400
        );
      }

      // 準備訊息資料，確保 chatId 正確設定
      const chatMessage = {
        content: messageData.content.trim(),
        role: messageData.role.toLowerCase(),
        chatId: chatId, // 使用路徑參數的 chatId
        messageId: messageData.messageId,
        createdAt: new Date(), // 這會在 Repository 層被覆蓋，但保持一致性
      };

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const chatRepository = new FirestoreChatRepository(firestore);
      const chatService = new ChatService(chatRepository);
      const chatController = new ChatController(chatService);

      // 調用 Controller 層處理業務邏輯
      const response = await chatController.sendMessage(userId, chatMessage);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型
        let statusCode = 500;
        if (response.error?.includes("找不到") || response.error?.includes("沒有權限")) {
          statusCode = 404;
        } else if (response.error?.includes("不能為空") || response.error?.includes("無效") || response.error?.includes("超過")) {
          statusCode = 400;
        }

        return c.json(
          ChatController.toErrorResponse(response, statusCode),
          statusCode as 400 | 404 | 500
        );
      }

      // 返回成功響應 - 使用 201 Created 狀態碼
      return c.json(
        {
          success: true,
          message: "訊息發送成功",
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: ChatMessageAdd 處理錯誤:", error);

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

      // 處理請求資料驗證錯誤
      if (error instanceof Error && error.message.includes("validation")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "請求資料格式錯誤" }],
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