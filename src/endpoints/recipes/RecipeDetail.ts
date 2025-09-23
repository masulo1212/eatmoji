import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { RecipeResponseSchema } from "../../types/recipe";

// 導入分層架構
import { RecipeController } from "../../controllers/recipeController";
import { FirestoreRecipeRepository } from "../../repositories/recipeRepository";
import { RecipeService } from "../../services/recipeService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * RecipeDetail endpoint - 取得單一食譜詳情
 * 對應 Flutter 的 getRecipe 方法
 */
export class RecipeDetail extends OpenAPIRoute {
  public schema = {
    tags: ["Recipes"],
    summary: "取得食譜詳情",
    description: "根據 ID 取得單一食譜的詳細資訊",
    operationId: "getRecipe",
    request: {
      params: z.object({
        id: z.string().describe("食譜 ID"),
      }),
    },
    responses: {
      "200": {
        description: "成功取得食譜詳情",
        content: {
          "application/json": {
            schema: RecipeResponseSchema.openapi({
              description: "食譜詳情回應",
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
  };

  public async handle(c: AppContext) {
    try {
      // 獲取請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const { id: recipeId } = data.params;

      // 初始化分層架構（不需要圖片服務）
      const firestore = getFirestoreFromContext(c);
      const recipeRepository = new FirestoreRecipeRepository(firestore);
      const recipeService = new RecipeService(recipeRepository);
      const recipeController = new RecipeController(recipeService);

      // 調用 Controller 層處理業務邏輯
      const response = await recipeController.getRecipe(recipeId);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("不能為空") ? 400 : 500;
        return c.json(
          RecipeController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 如果食譜不存在，返回 404
      if (response.result === null) {
        return c.json(
          {
            success: false,
            errors: [{ code: 404, message: "Recipe not found" }],
          },
          404
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: RecipeDetail 處理錯誤:", error);

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