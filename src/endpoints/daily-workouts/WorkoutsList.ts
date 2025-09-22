import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DailyWorkoutListResponseSchema } from "../../types/dailyWorkout";

// 導入分層架構
import { DailyWorkoutController } from "../../controllers/dailyWorkoutController";
import { FirestoreDailyWorkoutRepository } from "../../repositories/dailyWorkoutRepository";
import { DailyWorkoutService } from "../../services/dailyWorkoutService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * WorkoutsList endpoint - 獲取使用者的運動列表
 * 對應 Flutter 的 getExerciseEntries 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class WorkoutsList extends OpenAPIRoute {
  public schema = {
    tags: ["Daily Workouts"],
    summary: "獲取使用者的運動列表",
    description: "獲取已驗證使用者的運動列表，支援可選的日期過濾",
    operationId: "getWorkouts",
    request: {
      query: z.object({
        // 可選的日期過濾參數，格式：YYYY-MM-DD
        date: z
          .string()
          .optional()
          .describe("過濾此日期之後的運動記錄（包含此日期）"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取運動列表",
        content: {
          "application/json": {
            schema: DailyWorkoutListResponseSchema.openapi({
              description: "運動列表回應",
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

      // 獲取查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { date: dateString } = data.query;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const workoutRepository = new FirestoreDailyWorkoutRepository(firestore);
      const workoutService = new DailyWorkoutService(workoutRepository);
      const workoutController = new DailyWorkoutController(workoutService);

      // 調用 Controller 層處理業務邏輯
      // console.log("WorkoutsList: userId", userId);
      // console.log("WorkoutsList: dateString", dateString);
      const response = await workoutController.getWorkouts(userId, dateString);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("日期格式") ? 400 : 500;
        return c.json(
          DailyWorkoutController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: WorkoutsList 處理錯誤:", error);

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
