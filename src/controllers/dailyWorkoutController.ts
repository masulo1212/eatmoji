import { DailyWorkout, AddExerciseRequest, UpdateDailyWorkoutRequest } from "../types/dailyWorkout";
import { IDailyWorkoutService } from "../services/dailyWorkoutService";

/**
 * API 響應格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * API 錯誤響應格式
 */
export interface ApiErrorResponse {
  success: false;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

/**
 * DailyWorkout Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class DailyWorkoutController {
  constructor(private workoutService: IDailyWorkoutService) {}

  /**
   * 取得運動列表
   * @param userId 使用者 ID
   * @param dateString 可選的日期字串 (YYYY-MM-DD)
   * @returns API 響應格式
   */
  async getWorkouts(
    userId: string,
    dateString?: string
  ): Promise<ApiResponse<DailyWorkout[]>> {
    try {
      // 驗證和轉換日期參數
      let dateFilter: Date | undefined;
      if (dateString) {
        dateFilter = new Date(dateString);
        if (isNaN(dateFilter.getTime())) {
          return {
            success: false,
            error: "無效的日期格式，請使用 YYYY-MM-DD 格式",
          };
        }
      }

      // 調用 Service 層
      const workouts = await this.workoutService.getWorkouts(userId, dateFilter);

      return {
        success: true,
        result: workouts,
      };
    } catch (error) {
      console.error("Controller: 取得運動列表失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得運動列表時發生未知錯誤",
      };
    }
  }

  /**
   * 取得指定日期的運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns API 響應格式
   */
  async getWorkoutByDate(
    userId: string,
    date: string
  ): Promise<ApiResponse<DailyWorkout | null>> {
    try {
      // 基本參數驗證
      if (!date.trim()) {
        return {
          success: false,
          error: "日期不能為空",
        };
      }

      // 調用 Service 層
      const workout = await this.workoutService.getWorkoutByDate(userId, date);

      return {
        success: true,
        result: workout,
      };
    } catch (error) {
      console.error("Controller: 取得運動記錄失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error 
            ? error.message 
            : "取得運動記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 新增手動運動
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseData 運動資料
   * @returns API 響應格式
   */
  async addManualExercise(
    userId: string,
    date: string,
    exerciseData: AddExerciseRequest
  ): Promise<ApiResponse<DailyWorkout>> {
    try {
      // 基本參數驗證
      if (!date.trim()) {
        return {
          success: false,
          error: "日期不能為空",
        };
      }

      if (!exerciseData.type?.trim()) {
        return {
          success: false,
          error: "運動類型不能為空",
        };
      }

      if (exerciseData.caloriesBurned < 0) {
        return {
          success: false,
          error: "消耗卡路里不能為負數",
        };
      }

      if (exerciseData.duration !== null && exerciseData.duration < 0) {
        return {
          success: false,
          error: "運動時間不能為負數",
        };
      }

      if (exerciseData.distance !== undefined && exerciseData.distance !== null && exerciseData.distance < 0) {
        return {
          success: false,
          error: "距離不能為負數",
        };
      }

      if (exerciseData.progress < 0 || exerciseData.progress > 100) {
        return {
          success: false,
          error: "進度必須在 0-100 之間",
        };
      }

      // 調用 Service 層
      const updatedWorkout = await this.workoutService.addManualExercise(
        userId,
        date,
        exerciseData
      );

      return {
        success: true,
        result: updatedWorkout,
      };
    } catch (error) {
      console.error("Controller: 新增運動失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error 
            ? error.message 
            : "新增運動時發生未知錯誤",
      };
    }
  }

  /**
   * 刪除運動
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseId 運動 ID
   * @returns API 響應格式
   */
  async deleteExercise(
    userId: string,
    date: string,
    exerciseId: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!date.trim()) {
        return {
          success: false,
          error: "日期不能為空",
        };
      }

      if (!exerciseId.trim()) {
        return {
          success: false,
          error: "運動 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.workoutService.deleteExercise(userId, date, exerciseId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 刪除運動失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error 
            ? error.message 
            : "刪除運動時發生未知錯誤",
      };
    }
  }

  /**
   * 更新完整的每日運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param workoutData 完整的運動記錄資料
   * @returns API 響應格式
   */
  async updateDailyWorkout(
    userId: string,
    date: string,
    workoutData: UpdateDailyWorkoutRequest
  ): Promise<ApiResponse<DailyWorkout>> {
    try {
      // 基本參數驗證
      if (!date.trim()) {
        return {
          success: false,
          error: "日期不能為空",
        };
      }

      if (!workoutData.platform?.trim()) {
        return {
          success: false,
          error: "平台資訊不能為空",
        };
      }

      if (workoutData.totalCaloriesBurned < 0) {
        return {
          success: false,
          error: "總消耗卡路里不能為負數",
        };
      }

      if (workoutData.steps !== undefined && workoutData.steps < 0) {
        return {
          success: false,
          error: "步數不能為負數",
        };
      }

      // 調用 Service 層
      const updatedWorkout = await this.workoutService.updateDailyWorkout(
        userId,
        date,
        workoutData
      );

      return {
        success: true,
        result: updatedWorkout,
      };
    } catch (error) {
      console.error("Controller: 更新完整運動記錄失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error 
            ? error.message 
            : "更新完整運動記錄時發生未知錯誤",
      };
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
  ): ApiErrorResponse {
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