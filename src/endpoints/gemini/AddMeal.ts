import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  AddMealRequestSchema,
  AddMealResponseSchema,
  SupportedLanguage,
} from "../../types/gemini";

// 導入分層架構
import { GeminiController } from "../../controllers/geminiController";
import { GeminiService } from "../../services/geminiService";
import { VertexAIService } from "../../services/vertexAIService";

/**
 * AddMeal endpoint - 分析餐點文字描述
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class AddMeal extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "分析餐點文字描述",
    description:
      "使用 Gemini AI 分析用戶輸入的餐點文字描述，返回詳細的營養資訊和健康評估",
    operationId: "analyzeMeal",
    request: {
      body: {
        content: {
          "application/json": {
            schema: AddMealRequestSchema.openapi({
              description: "餐點分析請求",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功分析餐點",
        content: {
          "application/json": {
            schema: AddMealResponseSchema.openapi({
              description: "餐點分析結果",
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

      // 4. 初始化依賴鏈（Service → Controller）
      const vertexAIService = new VertexAIService();
      const geminiService = new GeminiService();
      const geminiController = new GeminiController(geminiService);

      // 5. 調用 Controller 處理業務邏輯
      const result = await geminiController.analyzeMeal(
        input,
        user_language as SupportedLanguage,
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
                message: result.error || "分析餐點時發生錯誤",
              },
            ],
          },
          400
        );
      }
    } catch (error) {
      console.error("AddMeal endpoint - 處理請求時發生錯誤:", error);

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
