import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { TaskStatus } from "../../../types/diary";
import { AppContext } from "../../../types";
import { getFirestoreServiceFromContext } from "../../../utils/firebase";
import { DailyWorkoutController } from "../daily-workout.controller";
import { DailyWorkoutService } from "../daily-workout.service";
import { DailyWorkoutRepository } from "../daily-workout.repository";
import { GetWorkoutsResponseSchema } from "../dtos/get-workouts.dto";

/**
 * WorkoutsList endpoint - 獲取使用者的運動列表
 * 重構為使用 NestJS 風格的分層架構，但保持 OpenAPI 3.1 schema
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
            schema: GetWorkoutsResponseSchema.openapi({
              description: "運動列表回應",
              example: {
                success: true,
                result: [
                  {
                    diaryDate: "2025-10-03T00:00:00.000Z",
                    totalCaloriesBurned: 500,
                    manualWorkouts: [
                      {
                        id: "exercise_1727942400000_abc123",
                        type: "跑步",
                        caloriesBurned: 300,
                        duration: 30,
                        distance: 5.0,
                        createdAt: "2025-10-03T10:00:00.000Z",
                        status: TaskStatus.DONE,
                        progress: 100
                      }
                    ],
                    steps: 8000,
                    platform: "ios",
                    createdAt: "2025-10-03T10:00:00.000Z",
                    updatedAt: "2025-10-03T11:00:00.000Z"
                  }
                ]
              },
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
      const userId = c.get("userId");
      if (!userId) {
        return c.json(
          {
            success: false,
            errors: [{ code: 401, message: "Authentication required" }],
          },
          401
        );
      }

      // 獲取查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { date: dateString } = data.query;

      // 依賴注入：初始化完整的分層架構
      const firestoreService = getFirestoreServiceFromContext(c);
      const workoutRepository = new DailyWorkoutRepository(firestoreService);
      const workoutService = new DailyWorkoutService(workoutRepository);
      const workoutController = new DailyWorkoutController(workoutService);

      // 調用 Controller 處理業務邏輯
      const result = await workoutController.getWorkouts({ userId, date: dateString });

      // 根據 Controller 結果返回適當的 HTTP 響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        // 轉換為標準錯誤響應格式
        const statusCode = result.error?.includes("日期格式") ? 400 : 500;
        return c.json(
          DailyWorkoutController.toErrorResponse(result, statusCode),
          statusCode
        );
      }
    } catch (error) {
      console.error("Endpoint: WorkoutsList 處理錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message.includes("使用者 ID 未找到")
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