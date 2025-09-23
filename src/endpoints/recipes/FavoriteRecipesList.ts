import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { FavoriteRecipeListResponseSchema } from "../../types/recipe";

// 導入分層架構
import { RecipeController } from "../../controllers/recipeController";
import { FirestoreRecipeRepository } from "../../repositories/recipeRepository";
import { RecipeService } from "../../services/recipeService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavoriteRecipesList endpoint - 取得收藏食譜列表
 * 對應 Flutter 的 getFavRecipes 方法
 */
export class FavoriteRecipesList extends OpenAPIRoute {
  public schema = {
    tags: ["Recipes", "Favorites"],
    summary: "取得收藏食譜",
    description: "取得已驗證使用者的收藏食譜列表，按收藏時間降序排列",
    operationId: "getFavoriteRecipes",
    responses: {
      "200": {
        description: "成功取得收藏食譜列表",
        content: {
          "application/json": {
            schema: FavoriteRecipeListResponseSchema.openapi({
              description: "收藏食譜列表回應",
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

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const recipeRepository = new FirestoreRecipeRepository(firestore);
      const recipeService = new RecipeService(recipeRepository);
      const recipeController = new RecipeController(recipeService);

      // 調用 Controller 層處理業務邏輯
      const response = await recipeController.getFavoriteRecipes(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          RecipeController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: FavoriteRecipesList 處理錯誤:", error);

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