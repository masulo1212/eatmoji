import { IDailyWorkoutRepository } from "../repositories/dailyWorkoutRepository";
import {
  AddExerciseRequest,
  DailyWorkout,
  UpdateDailyWorkoutRequest,
} from "../types/dailyWorkout";

/**
 * DailyWorkout Service 介面 - 定義業務邏輯操作
 */
export interface IDailyWorkoutService {
  /**
   * 取得使用者的運動列表
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns DailyWorkout 陣列
   */
  getWorkouts(userId: string, date?: Date): Promise<DailyWorkout[]>;

  /**
   * 取得指定日期的運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns DailyWorkout 物件或 null
   */
  getWorkoutByDate(userId: string, date: string): Promise<DailyWorkout | null>;

  /**
   * 新增手動運動
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseData 運動資料
   * @returns 更新後的 DailyWorkout 物件
   */
  addManualExercise(
    userId: string,
    date: string,
    exerciseData: AddExerciseRequest
  ): Promise<DailyWorkout>;

  /**
   * 刪除運動
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseId 運動 ID
   */
  deleteExercise(
    userId: string,
    date: string,
    exerciseId: string
  ): Promise<void>;

  /**
   * 更新完整的每日運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param workoutData 完整的運動記錄資料
   * @returns 更新後的 DailyWorkout 物件
   */
  updateDailyWorkout(
    userId: string,
    date: string,
    workoutData: UpdateDailyWorkoutRequest
  ): Promise<DailyWorkout>;
}

/**
 * DailyWorkout Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理
 */
export class DailyWorkoutService implements IDailyWorkoutService {
  constructor(private workoutRepository: IDailyWorkoutRepository) {}

  /**
   * 取得運動列表，支援可選的日期過濾
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則
   * - 委派給 Repository 執行資料查詢
   *
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns DailyWorkout 陣列
   */
  async getWorkouts(userId: string, date?: Date): Promise<DailyWorkout[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    // 日期驗證（如果提供）
    if (date && isNaN(date.getTime())) {
      throw new Error("提供的日期格式無效");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const workouts = await this.workoutRepository.findByUser(userId, date);

      // 套用業務規則處理
      return this.applyBusinessRules(workouts);
    } catch (error) {
      console.error("Service: 取得運動列表時發生業務邏輯錯誤:", error);
      throw new Error("取得運動列表失敗");
    }
  }

  /**
   * 取得指定日期的運動記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保日期格式正確
   *
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns DailyWorkout 物件或 null
   */
  async getWorkoutByDate(
    userId: string,
    date: string
  ): Promise<DailyWorkout | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!date || date.trim() === "") {
      throw new Error("日期不能為空");
    }

    // 驗證日期格式 (YYYY-MM-DD)
    if (!this.isValidDateFormat(date)) {
      throw new Error("日期格式必須為 YYYY-MM-DD");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const workout = await this.workoutRepository.findByDate(userId, date);

      return workout;
    } catch (error) {
      console.error("Service: 取得運動記錄時發生業務邏輯錯誤:", error);
      throw new Error("取得運動記錄失敗");
    }
  }

  /**
   * 新增手動運動
   * 業務邏輯：
   * - 驗證運動資料
   * - 套用業務規則
   * - 確保資料一致性
   *
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseData 運動資料
   * @returns 更新後的 DailyWorkout 物件
   */
  async addManualExercise(
    userId: string,
    date: string,
    exerciseData: AddExerciseRequest
  ): Promise<DailyWorkout> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!date || date.trim() === "") {
      throw new Error("日期不能為空");
    }

    if (!this.isValidDateFormat(date)) {
      throw new Error("日期格式必須為 YYYY-MM-DD");
    }

    if (!exerciseData.type || exerciseData.type.trim() === "") {
      throw new Error("運動類型不能為空");
    }

    // 套用業務規則驗證
    const validatedExerciseData =
      this.applyExerciseValidationRules(exerciseData);

    try {
      // 委派給 Repository 執行資料新增
      const updatedWorkout = await this.workoutRepository.addManualExercise(
        userId,
        date,
        validatedExerciseData
      );

      return updatedWorkout;
    } catch (error) {
      console.error("Service: 新增運動時發生業務邏輯錯誤:", error);
      throw new Error("新增運動失敗");
    }
  }

  /**
   * 刪除運動
   * 業務邏輯：
   * - 驗證刪除權限
   * - 確保使用者只能刪除自己的運動
   *
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param exerciseId 運動 ID
   */
  async deleteExercise(
    userId: string,
    date: string,
    exerciseId: string
  ): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!date || date.trim() === "") {
      throw new Error("日期不能為空");
    }

    if (!this.isValidDateFormat(date)) {
      throw new Error("日期格式必須為 YYYY-MM-DD");
    }

    if (!exerciseId || exerciseId.trim() === "") {
      throw new Error("運動 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行刪除
      await this.workoutRepository.deleteExercise(userId, date, exerciseId);
    } catch (error) {
      console.error("Service: 刪除運動時發生業務邏輯錯誤:", error);
      throw new Error("刪除運動失敗");
    }
  }

  /**
   * 更新完整的每日運動記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 驗證日期格式
   * - 驗證運動記錄資料
   *
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param workoutData 完整的運動記錄資料
   * @returns 更新後的 DailyWorkout 物件
   */
  async updateDailyWorkout(
    userId: string,
    date: string,
    workoutData: UpdateDailyWorkoutRequest
  ): Promise<DailyWorkout> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!date || date.trim() === "") {
      throw new Error("日期不能為空");
    }

    if (!this.isValidDateFormat(date)) {
      throw new Error("日期格式必須為 YYYY-MM-DD");
    }

    if (!workoutData.platform || workoutData.platform.trim() === "") {
      throw new Error("平台資訊不能為空");
    }

    if (workoutData.totalCaloriesBurned < 0) {
      throw new Error("總消耗卡路里不能為負數");
    }

    if (workoutData.steps !== undefined && workoutData.steps < 0) {
      throw new Error("步數不能為負數");
    }

    // 套用業務規則驗證
    const validatedWorkoutData = this.applyWorkoutValidationRules(workoutData);

    try {
      // 委派給 Repository 執行資料更新
      const updatedWorkout = await this.workoutRepository.updateDailyWorkout(
        userId,
        date,
        validatedWorkoutData
      );

      return updatedWorkout;
    } catch (error) {
      console.error("Service: 更新完整運動記錄時發生業務邏輯錯誤:", error);
      throw new Error("更新完整運動記錄失敗");
    }
  }

  /**
   * 套用運動列表的業務規則
   * @param workouts 原始運動列表
   * @returns 處理後的運動列表
   */
  private applyBusinessRules(workouts: DailyWorkout[]): DailyWorkout[] {
    // 套用簡單的業務規則，例如：過濾、排序等
    return workouts.filter((workout) => {
      // 確保有效的運動記錄
      return workout.totalCaloriesBurned >= 0;
    });
  }

  /**
   * 套用運動資料驗證規則
   * @param exerciseData 原始運動資料
   * @returns 驗證後的運動資料
   */
  private applyExerciseValidationRules(
    exerciseData: AddExerciseRequest
  ): AddExerciseRequest {
    return {
      id: exerciseData.id,
      type: exerciseData.type.trim(),
      caloriesBurned: Math.max(0, exerciseData.caloriesBurned),
      duration:
        exerciseData.duration !== null
          ? Math.max(0, exerciseData.duration)
          : null,
      distance:
        exerciseData.distance !== null && exerciseData.distance !== undefined
          ? Math.max(0, exerciseData.distance)
          : exerciseData.distance,
      progress: Math.min(100, Math.max(0, exerciseData.progress)),
    };
  }

  /**
   * 套用完整運動記錄的業務規則
   * @param workoutData 原始運動記錄資料
   * @returns 驗證後的運動記錄資料
   */
  private applyWorkoutValidationRules(
    workoutData: UpdateDailyWorkoutRequest
  ): UpdateDailyWorkoutRequest {
    return {
      diaryDate: workoutData.diaryDate,
      totalCaloriesBurned: Math.max(0, workoutData.totalCaloriesBurned),
      manualWorkouts: workoutData.manualWorkouts.map((exercise) => ({
        ...exercise,
        caloriesBurned: Math.max(0, exercise.caloriesBurned),
        duration:
          exercise.duration !== null ? Math.max(0, exercise.duration) : null,
        distance:
          exercise.distance !== null && exercise.distance !== undefined
            ? Math.max(0, exercise.distance)
            : exercise.distance,
        progress: Math.min(100, Math.max(0, exercise.progress)),
      })),
      healthkitWorkouts: workoutData.healthkitWorkouts?.map((exercise) => ({
        ...exercise,
        caloriesBurned: Math.max(0, exercise.caloriesBurned),
        duration:
          exercise.duration !== null ? Math.max(0, exercise.duration) : null,
        distance:
          exercise.distance !== null && exercise.distance !== undefined
            ? Math.max(0, exercise.distance)
            : exercise.distance,
        progress: Math.min(100, Math.max(0, exercise.progress)),
      })),
      steps:
        workoutData.steps !== undefined
          ? Math.max(0, workoutData.steps)
          : undefined,
      platform: workoutData.platform.trim(),
    };
  }

  /**
   * 驗證日期格式 (YYYY-MM-DD)
   * @param dateString 日期字串
   * @returns 是否為有效格式
   */
  private isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    // 驗證日期是否真實存在
    const date = new Date(dateString);
    const [year, month, day] = dateString.split("-").map(Number);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }
}
