import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  EditRecipeResponseSchema,
  SupportedLanguage,
} from "../../types/gemini";

// 導入分層架構
import { GeminiController } from "../../controllers/geminiController";
import { GeminiService } from "../../services/geminiService";

/**
 * EditRecipe endpoint - 編輯食譜並提供多語言翻譯
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Service 層
 * - 錯誤響應格式化
 */
export class EditRecipe extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "編輯食譜並提供多語言翻譯",
    description:
      "使用 Gemini AI 編輯現有食譜，根據用戶提供的名稱、描述和步驟進行多語言翻譯。支持嚴格的步驟數量一致性和內容忠實度要求。",
    operationId: "editRecipe",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z
                .string()
                .min(1, "Recipe name cannot be empty")
                .max(100, "Recipe name cannot exceed 100 characters")
                .openapi({
                  description: "Recipe name",
                  example: "Scrambled Eggs with Tomatoes",
                }),
              description: z
                .string()
                .min(1, "Recipe description cannot be empty")
                .max(500, "Recipe description cannot exceed 500 characters")
                .openapi({
                  description: "Recipe description",
                  example: "A simple and nutritious home-cooked dish",
                }),
              step_texts: z
                .array(z.string().min(1, "Step cannot be empty"))
                .min(1, "Step list cannot be empty")
                .openapi({
                  description: "Array of cooking steps",
                  example: [
                    "Beat eggs and add a little salt",
                    "Heat oil in pan, pour in egg mixture and scramble",
                    "Add more oil and stir-fry tomatoes",
                    "Add scrambled eggs and mix well",
                  ],
                }),
              user_language: z
                .string()
                .optional()
                .default("zh_TW")
                .openapi({
                  description: "User language code (default: zh_TW)",
                  example: "zh_TW",
                  enum: [
                    "zh_TW",
                    "zh_CN",
                    "en",
                    "ja",
                    "ko",
                    "vi",
                    "th",
                    "ms",
                    "id",
                    "fr",
                    "de",
                    "es",
                    "pt_BR",
                  ],
                }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功編輯食譜",
        content: {
          "application/json": {
            schema: EditRecipeResponseSchema.openapi({
              description: "編輯食譜結果",
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

      // 2. 解析 JSON 請求
      const requestBody = await c.req.json();

      // 3. 提取參數
      const name = requestBody.name || "";
      const description = requestBody.description || "";
      const stepTexts = requestBody.step_texts || [];
      const userLanguage = requestBody.user_language || "zh_TW";

      // 4. 驗證輸入參數
      const validationError = this.validateEditRecipeInput(
        name,
        description,
        stepTexts,
        userLanguage
      );

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

      // 5. 檢查步驟陣列
      if (!Array.isArray(stepTexts) || stepTexts.length === 0) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: "Step list cannot be empty",
              },
            ],
          },
          400
        );
      }

      // 6. 初始化依賴鏈（Service → Controller）
      // const vertexAIService = new VertexAIService();
      const geminiService = new GeminiService();
      const geminiController = new GeminiController(geminiService);

      // 7. 調用 Controller 處理業務邏輯
      const result = await geminiController.editRecipe(
        name,
        description,
        stepTexts,
        userLanguage as SupportedLanguage,
        c.env
      );

      // console.log("EditRecipe endpoint - 編輯結果:", result);

      // 8. 返回響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: result.error || "Error occurred while editing recipe",
              },
            ],
          },
          400
        );
      }
    } catch (error) {
      console.error("EditRecipe endpoint - 處理請求時發生錯誤:", error);

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
                message:
                  "Invalid request format, please use application/json format",
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

  /**
   * 驗證編輯食譜輸入參數
   */
  private validateEditRecipeInput(
    name: string,
    description: string,
    stepTexts: string[],
    userLanguage: string
  ): string | null {
    // 驗證食譜名稱
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return "Recipe name cannot be empty";
    }

    if (name.trim().length > 100) {
      return "Recipe name cannot exceed 100 characters";
    }

    // 驗證食譜描述
    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return "Recipe description cannot be empty";
    }

    if (description.trim().length > 500) {
      return "Recipe description cannot exceed 500 characters";
    }

    // 驗證步驟陣列
    if (!Array.isArray(stepTexts)) {
      return "Step list format is incorrect";
    }

    if (stepTexts.length === 0) {
      return "Step list cannot be empty";
    }

    if (stepTexts.length > 20) {
      return "Number of steps cannot exceed 20";
    }

    for (let i = 0; i < stepTexts.length; i++) {
      const step = stepTexts[i];
      if (!step || typeof step !== "string" || step.trim().length === 0) {
        return `Step ${i + 1} cannot be empty`;
      }
      if (step.trim().length > 500) {
        return `Step ${i + 1} cannot exceed 500 characters`;
      }
    }

    // 驗證語言代碼
    const supportedLanguages = [
      "zh_TW",
      "zh_CN",
      "en",
      "ja",
      "ko",
      "vi",
      "th",
      "ms",
      "id",
      "fr",
      "de",
      "es",
      "pt_BR",
    ];
    if (!supportedLanguages.includes(userLanguage)) {
      return "Unsupported language code";
    }

    return null;
  }
}
