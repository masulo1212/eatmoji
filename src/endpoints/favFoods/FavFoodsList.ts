import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { FoodEntryListResponseSchema } from "../../types/favFood";

// 導入分層架構
import { FavFoodController } from "../../controllers/favFoodController";
import { FirestoreFavFoodRepository } from "../../repositories/favFoodRepository";
import { FavFoodService } from "../../services/favFoodService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavFoodsList endpoint - 獲取使用者的收藏食物列表
 * 對應 Flutter 的 getFoodEntries() 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class FavFoodsList extends OpenAPIRoute {
  public schema = {
    tags: ["FavFoods"],
    summary: "獲取使用者的收藏食物列表",
    description: "獲取已驗證使用者的收藏食物列表，按建立時間降序排列",
    operationId: "getFavFoods",
    request: {},
    responses: {
      "200": {
        description: "成功獲取收藏食物列表",
        content: {
          "application/json": {
            schema: FoodEntryListResponseSchema.openapi({
              description: "收藏食物列表回應",
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
      const favFoodRepository = new FirestoreFavFoodRepository(firestore);
      const favFoodService = new FavFoodService(favFoodRepository);
      const favFoodController = new FavFoodController(favFoodService);

      // 調用 Controller 層處理業務邏輯
      const response = await favFoodController.getFoodEntries(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          FavFoodController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: FavFoodsList 處理錯誤:", error);

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