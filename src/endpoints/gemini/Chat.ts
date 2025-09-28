import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { ChatRequestSchema, ChatResponseSchema } from "../../types/chat";

// 導入分層架構
import { AIChatController } from "../../controllers/aiChatController";
import { AIChatService } from "../../services/aiChatService";

/**
 * Chat endpoint - 處理 AI 聊天和健康報告生成
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 * - 支援串流和非串流模式
 */
export class Chat extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "AI 聊天和健康報告生成",
    description:
      "使用 Gemini AI 處理聊天對話，可以生成健康報告或進行對話式問答，支援串流和非串流模式",
    operationId: "chat",
    request: {
      body: {
        content: {
          "application/json": {
            schema: ChatRequestSchema.openapi({
              description: "聊天請求",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功處理聊天請求",
        content: {
          "application/json": {
            schema: ChatResponseSchema.openapi({
              description: "聊天結果（報告模式）",
            }),
          },
          "text/event-stream": {
            schema: z.string().openapi({
              description: "串流聊天回應（問答模式）",
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
        description: "伺服器內部錯誤",
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
  };

  async handle(c: AppContext) {
    try {
      // 1. 驗證身份 - 需要有效的 Firebase 認證
      const userId = requireUserIdFromMiddleware(c);

      // 2. 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();

      const { input, userData, user_language, historyJson, generateReport } =
        data.body;

      // 3. 處理可選的 input 參數
      const userInput = input || "";

      // 4. 解析歷史記錄
      let history;
      try {
        history = JSON.parse(historyJson);
      } catch (error) {
        history = [];
      }

      // 5. 建立聊天數據
      const chatData = {
        userInput: userInput,
        userData: userData,
        userLanguage: user_language,
        history: history,
        generateReport: generateReport,
      };

      // 6. 初始化依賴鏈（Service → Controller）
      const aiChatService = new AIChatService();
      const aiChatController = new AIChatController(aiChatService);

      // 7. 驗證聊天數據
      const validationError = aiChatController.validateChatRequest(chatData);
      if (validationError) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: validationError }],
          },
          400
        );
      }

      // 8. 調用 Controller 處理業務邏輯
      const result = await aiChatController.processChat(chatData, c.env);

      // 9. 處理不同類型的響應
      if (result instanceof ReadableStream) {
        // 串流模式 - 返回 SSE 響應
        return aiChatController.createStreamResponse(result);
      } else {
        // 非串流模式 - 返回 JSON 響應
        return aiChatController.createJsonResponse(result);
      }
    } catch (error) {
      console.error("Chat endpoint - 處理請求時發生錯誤:", error);

      // 處理 Zod 驗證錯誤
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as any;
        const errorMessages = zodError.issues
          .map((issue: any) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");

        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: `資料驗證失敗: ${errorMessages}` }],
          },
          400 as any
        );
      }

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
          401 as any
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500 as any
      );
    }
  }
}
