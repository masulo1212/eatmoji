import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { 
  FoodEntryResponseSchema, 
  UpdateFoodEntrySchema,
  FoodEntrySchema
} from "../../types/favFood";

// 導入分層架構
import { FavFoodController } from "../../controllers/favFoodController";
import { FirestoreFavFoodRepository } from "../../repositories/favFoodRepository";
import { FavFoodService } from "../../services/favFoodService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavFoodUpdate endpoint - 更新收藏食物
 * 對應 Flutter 的 updateFoodEntry(FoodEntry foodEntry) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 路徑參數和請求體驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class FavFoodUpdate extends OpenAPIRoute {
  public schema = {
    tags: ["FavFoods"],
    summary: "更新收藏食物",
    description: "更新指定的收藏食物資料，對應 Flutter updateFoodEntry(FoodEntry foodEntry) 方法",
    operationId: "updateFavFood",
    request: {
      params: z.object({
        id: z.string().describe("要更新的收藏食物 ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateFoodEntrySchema.openapi({
              description: "要更新的收藏食物資料（部分欄位可選）",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功更新收藏食物",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
            }).openapi({
              description: "更新成功回應",
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

      // 獲取路徑參數和請求體
      const data = await this.getValidatedData<typeof this.schema>();
      const { id } = data.params;
      const updateData = data.body;

      // 基本參數驗證
      if (!id || id.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "收藏食物 ID 不能為空" }],
          },
          400
        );
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "更新資料不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const favFoodRepository = new FirestoreFavFoodRepository(firestore);
      const favFoodService = new FavFoodService(favFoodRepository);
      const favFoodController = new FavFoodController(favFoodService);

      // 構造完整的 FoodEntry 物件（對應 Flutter updateFoodEntry(FoodEntry foodEntry) 的參數）
      // 需要先獲取現有的資料，然後合併更新
      const existingResponse = await favFoodController.getFoodEntry(userId, id);
      
      if (!existingResponse.success || !existingResponse.result) {
        return c.json(
          {
            success: false,
            errors: [{ code: 404, message: "找不到指定的收藏食物" }],
          },
          404
        );
      }

      // 合併現有資料和更新資料，構造完整的 FoodEntry
      const foodEntryToUpdate = {
        ...existingResponse.result,
        ...updateData,
        id: id, // 確保 ID 不被覆蓋
      };

      // 調用 Controller 層處理業務邏輯
      const response = await favFoodController.updateFoodEntry(userId, foodEntryToUpdate);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型並返回適當的狀態碼
        let statusCode = 500;
        if (response.error?.includes("不能為空") || 
            response.error?.includes("不能為負數") ||
            response.error?.includes("必須大於")) {
          statusCode = 400;
        } else if (response.error?.includes("找不到") || 
                   response.error?.includes("沒有權限")) {
          statusCode = 404;
        }

        return c.json(
          FavFoodController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
      });
    } catch (error) {
      console.error("Endpoint: FavFoodUpdate 處理錯誤:", error);

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

      // 處理 JSON 解析錯誤
      if (error instanceof Error && error.message.includes("JSON")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Invalid JSON format" }],
          },
          400
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