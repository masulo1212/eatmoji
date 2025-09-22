import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DailyWorkoutResponseSchema } from "../../types/dailyWorkout";

// 導入分層架構
import { DailyWorkoutController } from "../../controllers/dailyWorkoutController";
import { FirestoreDailyWorkoutRepository } from "../../repositories/dailyWorkoutRepository";
import { DailyWorkoutService } from "../../services/dailyWorkoutService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * WorkoutByDate endpoint - 獲取指定日期的運動記錄
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class WorkoutByDate extends OpenAPIRoute {
  public schema = {
    tags: ["Daily Workouts"],
    summary: "獲取指定日期的運動記錄",
    description: "獲取已驗證使用者在指定日期的運動記錄",
    operationId: "getWorkoutByDate",
    request: {
      params: z.object({
        date: z.string().describe("日期 (YYYY-MM-DD 格式)"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取運動記錄",
        content: {
          "application/json": {
            schema: DailyWorkoutResponseSchema.openapi({
              description: "運動記錄回應",
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
      "404": {
        description: "找不到指定日期的運動記錄",
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
      const { date } = data.params;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const workoutRepository = new FirestoreDailyWorkoutRepository(firestore);
      const workoutService = new DailyWorkoutService(workoutRepository);
      const workoutController = new DailyWorkoutController(workoutService);

      // 調用 Controller 層處理業務邏輯
      const response = await workoutController.getWorkoutByDate(userId, date);

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500;
        if (
          response.error?.includes("日期格式") ||
          response.error?.includes("日期不能為空")
        ) {
          statusCode = 400;
        }

        return c.json(
          DailyWorkoutController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 如果找不到記錄，返回 null 結果但仍然是成功狀態
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: WorkoutByDate 處理錯誤:", error);

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
