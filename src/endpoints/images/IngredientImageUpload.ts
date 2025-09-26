import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { ImageUploadResultSchema } from "../../types/image";
import { ImageCompressionService } from "../../services/imageCompressionService";
import { R2StorageService } from "../../services/r2StorageService";
import { ImageUploadController } from "../../controllers/imageUploadController";

/**
 * 圖片上傳請求 Schema
 */
const IngredientImageUploadRequestSchema = z.object({
  imageData: z.union([z.string(), z.instanceof(Uint8Array)]).describe("圖片資料（Base64 字串或二進位資料）"),
  filename: z.string().optional().describe("自定義檔名（可選，不含副檔名）")
});

/**
 * API 響應 Schema
 */
const IngredientImageUploadResponseSchema = z.object({
  success: z.boolean().default(true),
  result: ImageUploadResultSchema.describe("圖片上傳結果")
});

/**
 * 錯誤響應 Schema
 */
const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  errors: z.array(
    z.object({
      code: z.number(),
      message: z.string(),
    })
  ),
});

/**
 * IngredientImageUpload endpoint - 上傳食材圖片到 R2
 * 
 * 功能：
 * - 接收 Base64 圖片資料
 * - 自動壓縮圖片
 * - 上傳到 R2 的 ingredients 資料夾
 * - 返回公開 URL
 */
export class IngredientImageUpload extends OpenAPIRoute {
  public schema = {
    tags: ["Images"],
    summary: "上傳食材圖片",
    description: "上傳單張食材圖片到 R2 存儲，自動壓縮並返回公開 URL",
    operationId: "uploadIngredientImage",
    request: {
      body: {
        content: {
          "application/json": {
            schema: IngredientImageUploadRequestSchema.openapi({
              description: "食材圖片上傳請求",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "圖片上傳成功",
        content: {
          "application/json": {
            schema: IngredientImageUploadResponseSchema.openapi({
              description: "圖片上傳成功響應",
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤或圖片處理失敗",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      "401": {
        description: "未授權 - 需要有效的 Firebase ID token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      "413": {
        description: "圖片檔案過大",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      "500": {
        description: "伺服器錯誤或上傳失敗",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
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
      console.log(`👤 使用者 ${userId} 請求上傳食材圖片`);

      // 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const request = data.body;
      console.log("📨 收到圖片上傳請求", {
        hasImageData: !!request.imageData,
        filename: request.filename,
        dataType: typeof request.imageData
      });

      // 初始化服務
      const compressionService = new ImageCompressionService();
      const r2StorageService = new R2StorageService(c.env.INGREDIENTS_BUCKET, c.env.R2_BUCKET_HASH);
      const uploadController = new ImageUploadController(compressionService, r2StorageService);

      // 處理圖片上傳
      const result = await uploadController.uploadIngredientImage({
        imageData: request.imageData,
        filename: request.filename
      });

      // 檢查處理結果
      if (!result.success) {
        console.error("❌ 圖片上傳失敗:", result.error);
        
        // 根據錯誤類型決定狀態碼
        let statusCode = 500;
        if (result.error?.includes("驗證") || result.error?.includes("格式") || result.error?.includes("無效")) {
          statusCode = 400;
        } else if (result.error?.includes("太大")) {
          statusCode = 413;
        }

        return c.json({
          success: false,
          errors: [{ code: statusCode, message: result.error }],
        }, statusCode as any);
      }

      console.log("✅ 圖片上傳成功:", result.result?.url);

      // 返回成功響應
      return c.json({
        success: true,
        result: result.result,
      }, 201);

    } catch (error) {
      console.error("❌ IngredientImageUpload 端點錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message === "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json({
          success: false,
          errors: [{ code: 401, message: "需要用戶認證" }],
        }, 401 as any);
      }

      // 處理 R2 相關錯誤
      if (error instanceof Error && error.message.includes("R2")) {
        return c.json({
          success: false,
          errors: [{ code: 500, message: `存儲服務錯誤: ${error.message}` }],
        }, 500 as any);
      }

      // 處理圖片處理相關錯誤
      if (
        error instanceof Error &&
        (error.message.includes("圖片") ||
          error.message.includes("壓縮") ||
          error.message.includes("格式"))
      ) {
        return c.json({
          success: false,
          errors: [{ code: 400, message: `圖片處理錯誤: ${error.message}` }],
        }, 400 as any);
      }

      // 處理其他未預期錯誤
      return c.json({
        success: false,
        errors: [{ code: 500, message: "伺服器內部錯誤" }],
      }, 500 as any);
    }
  }
}