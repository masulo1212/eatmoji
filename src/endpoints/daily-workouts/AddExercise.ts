import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import {
  AddExerciseRequestSchema,
  AddExerciseResponseSchema,
} from "../../types/dailyWorkout";

// 導入分層架構
import { DailyWorkoutController } from "../../controllers/dailyWorkoutController";
import { FirestoreDailyWorkoutRepository } from "../../repositories/dailyWorkoutRepository";
import { DailyWorkoutService } from "../../services/dailyWorkoutService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * AddExercise endpoint - 新增手動運動到指定日期
 * 對應 Flutter 的 addManualExercise 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class AddExercise extends OpenAPIRoute {
  public schema = {
    tags: ["Daily Workouts"],
    summary: "新增手動運動",
    description: "新增手動運動到指定日期的運動記錄",
    operationId: "addExercise",
    request: {
      params: z.object({
        date: z.string().describe("日期 (YYYY-MM-DD 格式)"),
      }),
      body: {
        content: {
          "application/json": {
            schema: AddExerciseRequestSchema.openapi({
              description: "運動資料",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "成功新增運動",
        content: {
          "application/json": {
            schema: AddExerciseResponseSchema.openapi({
              description: "新增運動回應",
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

      // 獲取路徑參數和請求體
      const data = await this.getValidatedData<typeof this.schema>();
      const { date } = data.params;
      const exerciseData = data.body;
      console.log("AddExercise: date", date);
      console.log("AddExercise: exerciseData", exerciseData);

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const workoutRepository = new FirestoreDailyWorkoutRepository(firestore);
      const workoutService = new DailyWorkoutService(workoutRepository);
      const workoutController = new DailyWorkoutController(workoutService);

      // 調用 Controller 層處理業務邏輯
      const response = await workoutController.addManualExercise(
        userId,
        date,
        exerciseData
      );

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500;
        if (
          response.error?.includes("日期格式") ||
          response.error?.includes("日期不能為空") ||
          response.error?.includes("運動類型不能為空") ||
          response.error?.includes("卡路里不能為負數") ||
          response.error?.includes("時間不能為負數") ||
          response.error?.includes("距離不能為負數") ||
          response.error?.includes("進度必須在")
        ) {
          statusCode = 400;
        }

        return c.json(
          DailyWorkoutController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json(
        {
          success: true,
          result: response.result,
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: AddExercise 處理錯誤:", error);

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
