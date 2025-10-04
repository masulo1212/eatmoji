import { Hono } from "hono";
import { getFirestoreServiceFromContext } from "../../utils/firebase";
import { authMiddleware } from "../../middleware/auth";
import { DailyWorkoutController } from "./daily-workout.controller";
import { DailyWorkoutService } from "./daily-workout.service";
import { DailyWorkoutRepository } from "./daily-workout.repository";

/**
 * DailyWorkout Module 依賴注入配置
 */
export interface DailyWorkoutModuleDependencies {
  firestore: any; // IFirestoreService
}

/**
 * DailyWorkout Module - NestJS 風格的模組管理
 * 
 * 功能：
 * - 管理 DailyWorkout 相關的所有依賴注入
 * - 註冊 Controller 到主應用程式
 * - 處理模組初始化和配置
 */
export class DailyWorkoutModule {
  private static instance: DailyWorkoutModule | null = null;
  private static isRegistered = false;

  private constructor() {}

  /**
   * 獲取模組單例
   */
  static getInstance(): DailyWorkoutModule {
    if (!this.instance) {
      this.instance = new DailyWorkoutModule();
    }
    return this.instance;
  }

  /**
   * 註冊 DailyWorkout 模組到主應用程式
   * @param app Hono 應用程式實例
   * @param dependencies 依賴注入配置
   */
  static register(
    app: Hono<any>,
    dependencies: DailyWorkoutModuleDependencies
  ): void {
    if (this.isRegistered) {
      console.log("DailyWorkoutModule 已經註冊，跳過重複註冊");
      return;
    }

    try {
      console.log("🏃 正在註冊 DailyWorkoutModule...");

      // 使用依賴注入中間件
      app.use("/daily-workouts/*", authMiddleware, async (c, next) => {
        try {
          // 動態建立依賴注入容器
          const firestoreService = getFirestoreServiceFromContext(c);
          const workoutRepository = new DailyWorkoutRepository(firestoreService);
          const workoutService = new DailyWorkoutService(workoutRepository);
          const workoutController = new DailyWorkoutController(workoutService);

          // 將 controller 附加到 context，供路由使用
          c.set("workoutController", workoutController);

          await next();
        } catch (error) {
          console.error("DailyWorkoutModule 依賴注入失敗:", error);
          return c.json(
            {
              success: false,
              errors: [
                { code: 500, message: "Daily workout service unavailable" },
              ],
            },
            500
          );
        }
      });

      // 註冊具體的路由端點
      this.registerRoutes(app);

      this.isRegistered = true;
      console.log("✅ DailyWorkoutModule 註冊完成");
    } catch (error) {
      console.error("❌ DailyWorkoutModule 註冊失敗:", error);
      throw error;
    }
  }

  /**
   * 註冊 DailyWorkout 路由到應用程式
   */
  private static registerRoutes(app: Hono<any>): void {
    // GET /daily-workouts - 獲取運動列表
    app.get("/daily-workouts", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const dateString = c.req.query("date");

        const result = await workoutController.getWorkouts({ userId, date: dateString });

        if (result.success) {
          return c.json(result, 200);
        } else {
          const statusCode = result.error?.includes("日期格式") ? 400 : 500;
          return c.json(
            DailyWorkoutController.toErrorResponse(result, statusCode),
            statusCode
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /daily-workouts/:date - 獲取指定日期的運動記錄
    app.get("/daily-workouts/:date", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const date = c.req.param("date");

        if (!date) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "日期參數缺失" }],
            },
            400
          );
        }

        const result = await workoutController.getWorkoutByDate({ userId, date });

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            DailyWorkoutController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts/:date 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // POST /daily-workouts/:date/exercises - 新增手動運動
    app.post("/daily-workouts/:date/exercises", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const date = c.req.param("date");

        if (!date) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "日期參數缺失" }],
            },
            400
          );
        }

        // 解析請求體
        const body = await c.req.json();
        const exerciseData = {
          id: body.id || `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: body.type,
          caloriesBurned: body.caloriesBurned || 0,
          duration: body.duration,
          distance: body.distance,
          progress: body.progress || 0,
        };

        const result = await workoutController.addExercise({ userId, date, exerciseData });

        if (result.success) {
          return c.json(result, 201);
        } else {
          return c.json(
            DailyWorkoutController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts/:date/exercises 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // DELETE /daily-workouts/:date/exercises/:exerciseId - 刪除運動
    app.delete("/daily-workouts/:date/exercises/:exerciseId", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const date = c.req.param("date");
        const exerciseId = c.req.param("exerciseId");

        if (!date || !exerciseId) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "日期或運動 ID 參數缺失" }],
            },
            400
          );
        }

        const result = await workoutController.deleteExercise({ userId, date, exerciseId });

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            DailyWorkoutController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts/:date/exercises/:exerciseId 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // PUT /daily-workouts/:date - 更新完整的每日運動記錄
    app.put("/daily-workouts/:date", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const date = c.req.param("date");

        if (!date) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "日期參數缺失" }],
            },
            400
          );
        }

        // 解析請求體
        const body = await c.req.json();
        const workoutData = {
          diaryDate: new Date(body.diaryDate || date),
          totalCaloriesBurned: body.totalCaloriesBurned || 0,
          manualWorkouts: body.manualWorkouts || [],
          healthkitWorkouts: body.healthkitWorkouts,
          steps: body.steps,
          platform: body.platform || "web",
        };

        const result = await workoutController.updateDailyWorkout({ userId, date, workoutData });

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            DailyWorkoutController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts/:date 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /daily-workouts/stats - 取得運動統計
    app.get("/daily-workouts/stats", async (c) => {
      try {
        const workoutController = c.get("workoutController") as DailyWorkoutController;
        const userId = c.get("userId");
        const startDateString = c.req.query("startDate");
        const endDateString = c.req.query("endDate");

        if (!startDateString || !endDateString) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "開始日期和結束日期參數必填" }],
            },
            400
          );
        }

        const result = await workoutController.getWorkoutStats(userId, startDateString, endDateString);

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            DailyWorkoutController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /daily-workouts/stats 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });
  }

  /**
   * 檢查模組是否已註冊
   */
  static isModuleRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * 重設模組狀態（測試用）
   */
  static reset(): void {
    this.instance = null;
    this.isRegistered = false;
  }
}