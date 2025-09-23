import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { RecipeResponseSchema, UpdateRecipeWithImagesSchema } from "../../types/recipe";

// 導入分層架構
import { RecipeController } from "../../controllers/recipeController";
import { FirestoreRecipeRepository } from "../../repositories/recipeRepository";
import { RecipeService } from "../../services/recipeService";
import { getFirestoreFromContext, getStorageFromContext } from "../../utils/firebase";
import { ImageCompressionService } from "../../services/imageCompressionService";

/**
 * RecipeUpdate endpoint - 更新食譜（包含圖片處理）
 * 對應 Flutter 的 updateRecipe 方法
 */
export class RecipeUpdate extends OpenAPIRoute {
  public schema = {
    tags: ["Recipes"],
    summary: "更新食譜",
    description: "更新現有食譜，支援主要圖片、步驟圖片和成分圖片的智慧處理",
    operationId: "updateRecipe",
    request: {
      params: z.object({
        id: z.string().describe("食譜 ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateRecipeWithImagesSchema.openapi({
              description: "更新食譜請求",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功更新食譜",
        content: {
          "application/json": {
            schema: RecipeResponseSchema.openapi({
              description: "食譜更新回應",
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
        description: "找不到食譜",
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

      // 獲取請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const { id: recipeId } = data.params;
      const requestBody = data.body;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const recipeRepository = new FirestoreRecipeRepository(firestore);
      
      // 初始化圖片服務
      const imageCompressionService = new ImageCompressionService();
      const storageService = getStorageFromContext(c);
      
      const recipeService = new RecipeService(
        recipeRepository, 
        imageCompressionService, 
        storageService
      );
      const recipeController = new RecipeController(recipeService);

      // 調用 Controller 層處理業務邏輯
      const response = await recipeController.updateRecipe(recipeId, requestBody);

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode: 400 | 404 | 500 = 500;
        if (response.error?.includes("不能為空")) {
          statusCode = 400;
        } else if (response.error?.includes("找不到")) {
          statusCode = 404;
        }
        
        return c.json(
          RecipeController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: RecipeUpdate 處理錯誤:", error);

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