import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { TranslateIngredientResponseSchema } from "../../types/gemini";

// 導入分層架構
import { GeminiController } from "../../controllers/geminiController";
import { GeminiService } from "../../services/geminiService";
import { VertexAIService } from "../../services/vertexAIService";

/**
 * TranslateIngredient endpoint - 翻譯食材名稱
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class TranslateIngredient extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "翻譯食材名稱",
    description:
      "使用 Gemini AI 將任何語言的食材名稱翻譯成簡短的英文名稱，不含括號註解或逗號補充",
    operationId: "translateIngredient",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              input: z
                .string()
                .min(1, "請輸入食材名稱")
                .max(200, "食材名稱過長，請限制在 200 字元以內")
                .openapi({
                  description: "要翻譯的食材名稱（任何語言）",
                  example: "蒜泥白肉",
                }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功翻譯食材",
        content: {
          "application/json": {
            schema: TranslateIngredientResponseSchema.openapi({
              description: "翻譯結果",
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
      requireUserIdFromMiddleware(c);

      // 2. 解析 JSON 請求體
      const requestBody = await c.req.json();

      // 3. 提取請求參數
      const userInput = requestBody.input;

      // 4. 初始化依賴鏈（Service → Controller）
      const isDev = c.env.NODE_ENV === "development";
      const geminiService = isDev ? new GeminiService() : new VertexAIService();
      //有時候會有錯誤 User location is not supported for the API use.
      // const vertexAIService = new VertexAIService();
      const geminiController = new GeminiController(geminiService);

      // 5. 驗證請求參數
      const validationError =
        geminiController.validateTranslateIngredientRequest(userInput);

      if (validationError) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: validationError,
              },
            ],
          },
          400
        );
      }

      // 6. 調用 Controller 處理業務邏輯
      const result = await geminiController.translateIngredient(
        userInput,
        c.env
      );

      // 7. 返回響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: result.error || "翻譯食材時發生錯誤",
              },
            ],
          },
          400
        );
      }
    } catch (error) {
      console.error(
        "TranslateIngredient endpoint - 處理請求時發生錯誤:",
        error
      );

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

      // 處理 JSON 解析錯誤
      if (
        error instanceof Error &&
        (error.message.includes("Failed to parse") ||
          error.message.includes("JSON"))
      ) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: "請求格式錯誤，請使用正確的 JSON 格式",
              },
            ],
          },
          400 as any
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
