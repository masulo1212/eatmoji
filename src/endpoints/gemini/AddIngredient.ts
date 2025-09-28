import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  AddIngredientRequestSchema,
  AddIngredientResponseSchema,
  SupportedLanguage,
} from "../../types/gemini";

// 導入分層架構
import { GeminiController } from "../../controllers/geminiController";
import { VertexAIService } from "../../services/vertexAIService";

/**
 * AddIngredient endpoint - 分析食材文字描述
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class AddIngredient extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "分析食材文字描述",
    description:
      "使用 Gemini AI 分析用戶輸入的食材文字描述，返回詳細的營養資訊和份量估算",
    operationId: "analyzeIngredient",
    request: {
      body: {
        content: {
          "application/json": {
            schema: AddIngredientRequestSchema.openapi({
              description: "食材分析請求",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功分析食材",
        content: {
          "application/json": {
            schema: AddIngredientResponseSchema.openapi({
              description: "食材分析結果",
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

      const { input, user_language } = data.body;

      // 3. 初始化依賴鏈（Service → Controller）
      const vertexAIService = new VertexAIService();
      const geminiController = new GeminiController(vertexAIService);

      // 4. 驗證請求參數
      const validationError = geminiController.validateAddIngredientRequest(
        input,
        user_language || "zh_TW"
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

      // 5. 調用 Controller 處理業務邏輯
      const result = await geminiController.analyzeIngredient(
        input,
        (user_language || "zh_TW") as SupportedLanguage,
        c.env
      );

      // 6. 返回響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: result.error || "分析食材時發生錯誤",
              },
            ],
          },
          400
        );
      }
    } catch (error) {
      console.error("AddIngredient endpoint - 處理請求時發生錯誤:", error);

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