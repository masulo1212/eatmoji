import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { FoodEntryResponseSchema } from "../../types/favFood";

// 導入分層架構
import { FavFoodController } from "../../controllers/favFoodController";
import { FirestoreFavFoodRepository } from "../../repositories/favFoodRepository";
import { FavFoodService } from "../../services/favFoodService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavFoodDetail endpoint - 獲取單一收藏食物詳情
 * 對應 Flutter 的 getFoodEntry(String id) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 路徑參數驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class FavFoodDetail extends OpenAPIRoute {
  public schema = {
    tags: ["FavFoods"],
    summary: "獲取單一收藏食物詳情",
    description: "根據 ID 獲取特定的收藏食物詳情",
    operationId: "getFavFood",
    request: {
      params: z.object({
        id: z.string().describe("收藏食物的 ID"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取收藏食物詳情",
        content: {
          "application/json": {
            schema: FoodEntryResponseSchema.openapi({
              description: "收藏食物詳情回應",
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
        description: "找不到指定的收藏食物",
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

      // 獲取路徑參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { id } = data.params;

      // 基本參數驗證
      if (!id || id.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "食物條目 ID 不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const favFoodRepository = new FirestoreFavFoodRepository(firestore);
      const favFoodService = new FavFoodService(favFoodRepository);
      const favFoodController = new FavFoodController(favFoodService);

      // 調用 Controller 層處理業務邏輯
      const response = await favFoodController.getFoodEntry(userId, id);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("ID 不能為空") ? 400 : 500;
        return c.json(
          FavFoodController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 檢查是否找到食物條目
      if (response.result === null) {
        return c.json(
          {
            success: false,
            errors: [{ code: 404, message: "找不到指定的收藏食物" }],
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
      console.error("Endpoint: FavFoodDetail 處理錯誤:", error);

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