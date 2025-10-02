import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { AddRecipeResponseSchema } from "../../types/analyze";
import { SupportedLanguage } from "../../types/gemini";

// 導入分層架構
import { GeminiController } from "../../controllers/geminiController";
import { GeminiService } from "../../services/geminiService";

/**
 * AddRecipe endpoint - 從餐點圖片創建食譜
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class AddRecipe extends OpenAPIRoute {
  public schema = {
    tags: ["Gemini AI"],
    summary: "從餐點圖片創建食譜",
    description:
      "使用 Gemini AI 分析用戶上傳的餐點圖片，返回完整的多語言食譜資訊，包含食材、製作步驟和營養評估",
    operationId: "addRecipe",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              images: z
                .union([z.instanceof(File), z.array(z.instanceof(File))])
                .openapi({
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description:
                    "餐點圖片文件（支援 JPEG、PNG、GIF、WebP），最多 5 張",
                  minItems: 1,
                  maxItems: 5,
                }),
              user_language: z
                .string()
                .optional()
                .default("zh_TW")
                .openapi({
                  description: "用戶語言代碼（預設：zh_TW）",
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
              user_input: z.string().optional().openapi({
                description: "用戶額外輸入描述（可選，最多 500 字元）",
                example: "這是一碗大份的拉麵，適合兩人分享",
                maxLength: 500,
              }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功創建食譜",
        content: {
          "application/json": {
            schema: AddRecipeResponseSchema.openapi({
              description: "食譜創建結果",
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
      "413": {
        description: "請求實體過大 - 圖片文件過大",
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

      // 2. 解析 multipart/form-data
      const formData = await c.req.formData();

      // 3. 提取並驗證圖片文件
      const imageFilesData = formData.getAll("images");
      const imageFiles: File[] = [];

      for (const fileData of imageFilesData) {
        if (
          fileData &&
          typeof fileData === "object" &&
          "name" in fileData &&
          "size" in fileData &&
          "type" in fileData
        ) {
          imageFiles.push(fileData as File);
        }
      }

      // 4. 提取其他參數
      const userLanguageData = formData.get("user_language");
      const userInputData = formData.get("user_input");

      const userLanguage = userLanguageData
        ? String(userLanguageData)
        : "zh_TW";
      const userInput = userInputData ? String(userInputData) : null;

      // 5. 初始化依賴鏈（Service → Controller）
      // const isDev = c.env.NODE_ENV === "development";
      // const geminiService = isDev ? new GeminiService() : new VertexAIService();
      const geminiService = new GeminiService();

      const geminiController = new GeminiController(geminiService);

      // 6. 驗證請求參數
      const validationError = geminiController.validateAnalyzeRequest(
        imageFiles,
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

      // 7. 驗證用戶輸入
      const inputValidationError =
        geminiController.validateUserInput(userInput);

      if (inputValidationError) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: inputValidationError,
              },
            ],
          },
          400
        );
      }

      // 8. 調用 Controller 處理業務邏輯
      const result = await geminiController.analyzeRecipe(
        imageFiles,
        userLanguage as SupportedLanguage,
        c.env,
        userInput
      );

      // 9. 返回響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: result.error || "創建食譜時發生錯誤",
              },
            ],
          },
          400
        );
      }
    } catch (error) {
      console.error("AddRecipe endpoint - 處理請求時發生錯誤:", error);

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

      // 處理文件大小錯誤
      if (
        error instanceof Error &&
        error.message.includes("exceeds maximum size")
      ) {
        return c.json(
          {
            success: false,
            errors: [
              { code: 413, message: "圖片文件過大，請上傳小於 10MB 的圖片" },
            ],
          },
          413 as any
        );
      }

      // 處理 FormData 解析錯誤
      if (
        error instanceof Error &&
        (error.message.includes("Failed to parse") ||
          error.message.includes("multipart"))
      ) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message:
                  "請求格式錯誤，請使用 multipart/form-data 格式上傳圖片",
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
