import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入分層架構
import { FavFoodController } from "../../controllers/favFoodController";
import { FirestoreFavFoodRepository } from "../../repositories/favFoodRepository";
import { FavFoodService } from "../../services/favFoodService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavFoodDelete endpoint - 刪除收藏食物
 * 對應 Flutter 的 deleteFoodEntry(String id) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 路徑參數驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class FavFoodDelete extends OpenAPIRoute {
  public schema = {
    tags: ["FavFoods"],
    summary: "刪除收藏食物",
    description:
      "刪除指定的收藏食物，對應 Flutter deleteFoodEntry(String id) 方法",
    operationId: "deleteFavFood",
    request: {
      params: z.object({
        id: z.string().describe("要刪除的收藏食物 ID"),
      }),
    },
    responses: {
      "204": {
        description: "成功刪除收藏食物（無內容回傳）",
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
      console.log("data", data);

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

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const favFoodRepository = new FirestoreFavFoodRepository(firestore);
      const favFoodService = new FavFoodService(favFoodRepository);
      const favFoodController = new FavFoodController(favFoodService);

      // 調用 Controller 層處理業務邏輯
      const response = await favFoodController.deleteFoodEntry(userId, id);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型並返回適當的狀態碼
        let statusCode = 500;
        if (response.error?.includes("ID 不能為空")) {
          statusCode = 400;
        } else if (
          response.error?.includes("找不到") ||
          response.error?.includes("沒有權限")
        ) {
          statusCode = 404;
        }

        return c.json(
          FavFoodController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應（204 No Content）
      // 對應 REST API 標準：DELETE 操作成功時返回 204 狀態碼且無內容
      return c.body(null, 204);
    } catch (error) {
      console.error("Endpoint: FavFoodDelete 處理錯誤:", error);

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
