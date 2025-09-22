import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DeleteExerciseResponseSchema } from "../../types/dailyWorkout";

// 導入分層架構
import { DailyWorkoutController } from "../../controllers/dailyWorkoutController";
import { FirestoreDailyWorkoutRepository } from "../../repositories/dailyWorkoutRepository";
import { DailyWorkoutService } from "../../services/dailyWorkoutService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * DeleteExercise endpoint - 刪除指定的運動
 * 對應 Flutter 的 deleteExercise 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class DeleteExercise extends OpenAPIRoute {
  public schema = {
    tags: ["Daily Workouts"],
    summary: "刪除運動",
    description: "刪除指定日期的指定運動記錄",
    operationId: "deleteExercise",
    request: {
      params: z.object({
        date: z
          .string()
          .describe("日期 (YYYY-MM-DD 格式)"),
        exerciseId: z
          .string()
          .describe("運動 ID"),
      }),
    },
    responses: {
      "200": {
        description: "成功刪除運動",
        content: {
          "application/json": {
            schema: DeleteExerciseResponseSchema.openapi({
              description: "刪除運動回應",
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
        description: "找不到要刪除的運動記錄",
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
      const { date, exerciseId } = data.params;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const workoutRepository = new FirestoreDailyWorkoutRepository(firestore);
      const workoutService = new DailyWorkoutService(workoutRepository);
      const workoutController = new DailyWorkoutController(workoutService);

      // 調用 Controller 層處理業務邏輯
      const response = await workoutController.deleteExercise(
        userId,
        date,
        exerciseId
      );

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500;
        if (
          response.error?.includes("日期格式") ||
          response.error?.includes("日期不能為空") ||
          response.error?.includes("運動 ID 不能為空")
        ) {
          statusCode = 400;
        } else if (
          response.error?.includes("找不到") ||
          response.error?.includes("不存在")
        ) {
          statusCode = 404;
        }

        return c.json(
          DailyWorkoutController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
      });
    } catch (error) {
      console.error("Endpoint: DeleteExercise 處理錯誤:", error);

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