import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { WeightEntryResponseSchema } from "../../types/weight";

// 導入分層架構
import { WeightController } from "../../controllers/weightController";
import { FirestoreWeightRepository } from "../../repositories/weightRepository";
import { WeightService } from "../../services/weightService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * WeightLatest endpoint - 取得最新體重記錄
 * 對應 Flutter 的 getLatestWeight 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class WeightLatest extends OpenAPIRoute {
  public schema = {
    tags: ["Weight"],
    summary: "取得最新體重記錄",
    description: "取得已驗證使用者的最新體重記錄",
    operationId: "getLatestWeight",
    responses: {
      "200": {
        description: "成功取得最新體重記錄",
        content: {
          "application/json": {
            schema: WeightEntryResponseSchema.openapi({
              description: "最新體重記錄回應（如果沒有記錄則 result 為 null）",
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
      const weightRepository = new FirestoreWeightRepository(firestore);
      const weightService = new WeightService(weightRepository);
      const weightController = new WeightController(weightService);

      // 調用 Controller 層處理業務邏輯
      const response = await weightController.getLatestWeight(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          WeightController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: WeightLatest 處理錯誤:", error);

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