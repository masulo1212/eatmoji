import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  ToArguments,
  ToResponse,
  Use,
} from "@asla/hono-decorator";
import { Context } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { IDailyWorkoutService } from "./daily-workout.service";
import { ApiResponse } from "../../shared/dtos/api-response.dto";
import {
  GetWorkoutsDto,
  GetWorkoutByDateDto,
  AddExerciseDto,
  DeleteExerciseDto,
  UpdateDailyWorkoutDto,
} from "./dtos";
import {
  DailyWorkout,
  AddExerciseRequest,
  UpdateDailyWorkoutRequest,
} from "./types/daily-workout.types";

/**
 * DailyWorkout Controller - 使用裝飾器版本
 * 處理每日運動相關的 HTTP 請求
 */
@Controller({ basePath: "/daily-workouts" })
@Use(authMiddleware) // 套用認證中間件到所有路由
export class DailyWorkoutController {
  constructor(private workoutService: IDailyWorkoutService) {}

  /**
   * 取得運動列表
   * GET /daily-workouts?date=YYYY-MM-DD
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const dateString = ctx.req.query("date");
    
    return [new GetWorkoutsDto({ userId, date: dateString })];
  })
  @ToResponse((data: ApiResponse<DailyWorkout[]>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/")
  async getWorkouts(dto: GetWorkoutsDto): Promise<ApiResponse<DailyWorkout[]>> {
    try {
      // 轉換日期參數
      let dateFilter: Date | undefined;
      if (dto.date) {
        dateFilter = new Date(dto.date);
        if (isNaN(dateFilter.getTime())) {
          return ApiResponse.error("無效的日期格式，請使用 YYYY-MM-DD 格式");
        }
      }

      const workouts = await this.workoutService.getWorkouts(dto.userId, dateFilter);
      return ApiResponse.success(workouts);
    } catch (error) {
      console.error("Controller: 取得運動列表失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "取得運動列表時發生未知錯誤"
      );
    }
  }

  /**
   * 取得指定日期的運動記錄
   * GET /daily-workouts/:date
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const date = ctx.req.param("date");
    if (!date) {
      throw new Error("日期參數缺失");
    }

    return [new GetWorkoutByDateDto({ userId, date })];
  })
  @ToResponse((data: ApiResponse<DailyWorkout | null>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/:date")
  async getWorkoutByDate(dto: GetWorkoutByDateDto): Promise<ApiResponse<DailyWorkout | null>> {
    try {
      const workout = await this.workoutService.getWorkoutByDate(dto.userId, dto.date);
      return ApiResponse.success(workout);
    } catch (error) {
      console.error("Controller: 取得指定日期運動記錄失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "取得運動記錄時發生未知錯誤"
      );
    }
  }

  /**
   * 新增手動運動
   * POST /daily-workouts/:date/exercises
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const date = ctx.req.param("date");
    if (!date) {
      throw new Error("日期參數缺失");
    }

    // 解析請求體
    const body = await ctx.req.json();
    const exerciseData: AddExerciseRequest = {
      id: body.id || `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: body.type,
      caloriesBurned: body.caloriesBurned || 0,
      duration: body.duration,
      distance: body.distance,
      progress: body.progress || 0,
    };

    return [new AddExerciseDto({ userId, date, exerciseData })];
  })
  @ToResponse((data: ApiResponse<DailyWorkout>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 201);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Post("/:date/exercises")
  async addExercise(dto: AddExerciseDto): Promise<ApiResponse<DailyWorkout>> {
    try {
      const updatedWorkout = await this.workoutService.addManualExercise(
        dto.userId,
        dto.date,
        dto.exerciseData
      );
      return ApiResponse.success(updatedWorkout);
    } catch (error) {
      console.error("Controller: 新增手動運動失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "新增手動運動時發生未知錯誤"
      );
    }
  }

  /**
   * 刪除運動
   * DELETE /daily-workouts/:date/exercises/:exerciseId
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const date = ctx.req.param("date");
    if (!date) {
      throw new Error("日期參數缺失");
    }

    const exerciseId = ctx.req.param("exerciseId");
    if (!exerciseId) {
      throw new Error("運動 ID 參數缺失");
    }

    return [new DeleteExerciseDto({ userId, date, exerciseId })];
  })
  @ToResponse((data: ApiResponse<void>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Delete("/:date/exercises/:exerciseId")
  async deleteExercise(dto: DeleteExerciseDto): Promise<ApiResponse<void>> {
    try {
      await this.workoutService.deleteExercise(dto.userId, dto.date, dto.exerciseId);
      return ApiResponse.success(undefined);
    } catch (error) {
      console.error("Controller: 刪除運動失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "刪除運動時發生未知錯誤"
      );
    }
  }

  /**
   * 更新完整的每日運動記錄
   * PUT /daily-workouts/:date
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const date = ctx.req.param("date");
    if (!date) {
      throw new Error("日期參數缺失");
    }

    // 解析請求體
    const body = await ctx.req.json();
    const workoutData: UpdateDailyWorkoutRequest = {
      diaryDate: new Date(body.diaryDate || date),
      totalCaloriesBurned: body.totalCaloriesBurned || 0,
      manualWorkouts: body.manualWorkouts || [],
      healthkitWorkouts: body.healthkitWorkouts,
      steps: body.steps,
      platform: body.platform || "web",
    };

    return [new UpdateDailyWorkoutDto({ userId, date, workoutData })];
  })
  @ToResponse((data: ApiResponse<DailyWorkout>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Put("/:date")
  async updateDailyWorkout(dto: UpdateDailyWorkoutDto): Promise<ApiResponse<DailyWorkout>> {
    try {
      const updatedWorkout = await this.workoutService.updateDailyWorkout(
        dto.userId,
        dto.date,
        dto.workoutData
      );
      return ApiResponse.success(updatedWorkout);
    } catch (error) {
      console.error("Controller: 更新每日運動記錄失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "更新每日運動記錄時發生未知錯誤"
      );
    }
  }

  /**
   * 取得運動統計（附加端點）
   * GET /daily-workouts/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    const startDateString = ctx.req.query("startDate");
    const endDateString = ctx.req.query("endDate");

    if (!startDateString || !endDateString) {
      throw new Error("開始日期和結束日期參數必填");
    }

    return [userId, startDateString, endDateString];
  })
  @ToResponse((data: ApiResponse<any>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/stats")
  async getWorkoutStats(
    userId: string,
    startDateString: string,
    endDateString: string
  ): Promise<ApiResponse<any>> {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ApiResponse.error("無效的日期格式，請使用 YYYY-MM-DD 格式");
      }

      const stats = await this.workoutService.calculateWorkoutStats(userId, startDate, endDate);
      return ApiResponse.success(stats);
    } catch (error) {
      console.error("Controller: 取得運動統計失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "取得運動統計時發生未知錯誤"
      );
    }
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ) {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }
}