import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { R2StorageService } from "../../services/r2StorageService";

/**
 * 檢查檔案響應 Schema
 */
const IngredientImageCheckResponseSchema = z.object({
  success: z.boolean().default(true),
  result: z.object({
    exists: z.boolean().describe("檔案是否存在"),
    filename: z.string().describe("完整檔名（含副檔名）"),
    url: z.string().url().optional().describe("檔案的公開 URL（如果存在）")
  })
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
 * IngredientImageCheck endpoint - 檢查食材圖片是否存在
 * 
 * 功能：
 * - 接收檔名參數
 * - 檢查 R2 的 ingredients 資料夾中是否存在該檔案
 * - 返回檢查結果和 URL（如果存在）
 */
export class IngredientImageCheck extends OpenAPIRoute {
  public schema = {
    tags: ["Images"],
    summary: "檢查食材圖片是否存在",
    description: "檢查指定檔名的食材圖片是否已存在於 R2 存儲中",
    operationId: "checkIngredientImage",
    parameters: [
      {
        name: "filename",
        in: "query" as const,
        required: true,
        description: "要檢查的檔名（不含副檔名）",
        schema: {
          type: "string" as const,
          example: "white_sesame"
        }
      }
    ],
    responses: {
      "200": {
        description: "檢查完成",
        content: {
          "application/json": {
            schema: IngredientImageCheckResponseSchema.openapi({
              description: "檔案存在檢查結果",
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤",
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
      "500": {
        description: "伺服器錯誤",
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
      console.log(`👤 使用者 ${userId} 請求檢查食材圖片`);

      // 獲取查詢參數
      const filename = c.req.query('filename');
      
      if (!filename) {
        return c.json({
          success: false,
          errors: [{ code: 400, message: "缺少必要的 filename 參數" }],
        }, 400);
      }

      if (typeof filename !== 'string' || filename.trim().length === 0) {
        return c.json({
          success: false,
          errors: [{ code: 400, message: "filename 參數必須是非空字串" }],
        }, 400);
      }

      // 格式化檔名
      const formattedFilename = R2StorageService.formatIngredientName(filename.trim());
      if (!formattedFilename) {
        return c.json({
          success: false,
          errors: [{ code: 400, message: "無效的檔名格式，請使用英文字母和數字" }],
        }, 400);
      }

      console.log(`🔍 檢查檔案: ${filename} -> ${formattedFilename}`);

      // 初始化 R2 存儲服務
      const r2StorageService = new R2StorageService(c.env.INGREDIENTS_BUCKET, c.env.R2_BUCKET_HASH);

      // 檢查檔案是否存在
      const checkResult = await r2StorageService.checkIngredientImageExists(formattedFilename);

      console.log(`✅ 檢查完成: ${formattedFilename}.png exists=${checkResult.exists}`);

      // 返回檢查結果
      return c.json({
        success: true,
        result: {
          exists: checkResult.exists,
          filename: `${formattedFilename}.png`,
          url: checkResult.url
        }
      }, 200);

    } catch (error) {
      console.error("❌ IngredientImageCheck 端點錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message === "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json({
          success: false,
          errors: [{ code: 401, message: "需要用戶認證" }],
        }, 401);
      }

      // 處理 R2 相關錯誤
      if (error instanceof Error && error.message.includes("R2")) {
        return c.json({
          success: false,
          errors: [{ code: 500, message: `存儲服務錯誤: ${error.message}` }],
        }, 500);
      }

      // 處理其他未預期錯誤
      return c.json({
        success: false,
        errors: [{ code: 500, message: "伺服器內部錯誤" }],
      }, 500);
    }
  }
}