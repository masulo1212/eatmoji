import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  CreateFoodEntryFromDiarySchema,
  FoodEntryResponseSchema,
} from "../../types/favFood";

// 導入分層架構
import { FavFoodController } from "../../controllers/favFoodController";
import { FirestoreFavFoodRepository } from "../../repositories/favFoodRepository";
import { FavFoodService } from "../../services/favFoodService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * FavFoodCreate endpoint - 從 Diary 創建收藏食物
 * 對應 Flutter 的 addFoodEntry({required Diary diary}) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 請求體驗證（保持與 Flutter 相同的參數格式）
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class FavFoodCreate extends OpenAPIRoute {
  public schema = {
    tags: ["FavFoods"],
    summary: "從 Diary 創建收藏食物",
    description:
      "將 Diary 加入收藏食物清單中，對應 Flutter addFoodEntry({required Diary diary}) 方法",
    operationId: "createFavFoodFromDiary",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateFoodEntryFromDiarySchema.openapi({
              description:
                "Diary 資料對象，直接傳送 diary 對象本身，對應 Flutter addFoodEntry({required Diary diary}) 方法",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "成功創建收藏食物",
        content: {
          "application/json": {
            schema: FoodEntryResponseSchema.openapi({
              description: "創建的收藏食物回應",
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
      "409": {
        description: "衝突 - 食物已在收藏清單中",
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

      // 獲取請求體並驗證
      const data = await this.getValidatedData<typeof this.schema>();
      const diary = data.body;

      // 額外的基本參數驗證
      if (!diary) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Diary 資料不能為空" }],
          },
          400
        );
      }

      if (!diary.id || diary.id.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Diary ID 不能為空" }],
          },
          400
        );
      }

      if (!diary.name || diary.name.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "Diary 名稱不能為空" }],
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
      // **保持與 Flutter 完全相同的參數格式：{required Diary diary}**
      const response = await favFoodController.addFoodEntry(userId, { diary });

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型並返回適當的狀態碼
        let statusCode = 500;
        if (response.error?.includes("不能為空")) {
          statusCode = 400;
        } else if (response.error?.includes("已在收藏清單中")) {
          statusCode = 409;
        }

        return c.json(
          FavFoodController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應（201 Created）
      return c.json(
        {
          success: true,
          result: response.result,
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: FavFoodCreate 處理錯誤:", error);

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
