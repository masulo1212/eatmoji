import { Injectable } from "../../shared";
import { IDailyWorkoutRepository } from "./daily-workout.repository";
import {
  DailyWorkout,
  AddExerciseRequest,
  UpdateDailyWorkoutRequest,
  WorkoutStats,
} from "./types/daily-workout.types";

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
  deleteExercise(userId: string, date: string, exerciseId: string): Promise<void>;

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

  /**
   * 計算運動統計
   * @param userId 使用者 ID
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @returns 運動統計資料
   */
  calculateWorkoutStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkoutStats>;

  /**
   * 驗證日期格式
   * @param dateString 日期字串
   * @returns 是否有效
   */
  validateDateFormat(dateString: string): boolean;
}

/**
 * DailyWorkout Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理
 */
@Injectable()
export class DailyWorkoutService implements IDailyWorkoutService {
  constructor(private workoutRepository: IDailyWorkoutRepository) {}

  /**
   * 取得使用者的運動列表
   * 業務邏輯：
   * - 驗證使用者 ID
   * - 處理日期過濾邏輯
   * - 排序和限制結果
   */
  async getWorkouts(userId: string, date?: Date): Promise<DailyWorkout[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      const workouts = await this.workoutRepository.findByUser(userId, date);

      // 業務邏輯：確保結果按日期降序排列
      return workouts.sort((a, b) => b.diaryDate.getTime() - a.diaryDate.getTime());
    } catch (error) {
      console.error("Service: 取得運動列表時發生業務邏輯錯誤:", error);
      throw new Error("取得運動列表失敗");
    }
  }

  /**
   * 取得指定日期的運動記錄
   * 業務邏輯：
   * - 驗證使用者 ID 和日期格式
   * - 處理日期轉換
   */
  async getWorkoutByDate(userId: string, date: string): Promise<DailyWorkout | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!this.validateDateFormat(date)) {
      throw new Error("日期格式無效，請使用 YYYY-MM-DD 格式");
    }

    try {
      return await this.workoutRepository.findByDate(userId, date);
    } catch (error) {
      console.error("Service: 取得指定日期運動記錄時發生業務邏輯錯誤:", error);
      throw new Error("取得運動記錄失敗");
    }
  }

  /**
   * 新增手動運動
   * 業務邏輯：
   * - 驗證參數完整性
   * - 驗證運動資料合理性
   * - 生成唯一 ID（如果沒有提供）
   * - 處理卡路里計算邏輯
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

    if (!this.validateDateFormat(date)) {
      throw new Error("日期格式無效，請使用 YYYY-MM-DD 格式");
    }

    // 驗證運動資料
    this.validateExerciseData(exerciseData);

    // 業務邏輯：生成唯一 ID（如果沒有提供）
    if (!exerciseData.id) {
      exerciseData.id = this.generateExerciseId();
    }

    // 業務邏輯：驗證日期不能是未來日期
    const workoutDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 設置為今天的最後一刻

    if (workoutDate > today) {
      throw new Error("不能為未來日期新增運動記錄");
    }

    try {
      const updatedWorkout = await this.workoutRepository.addManualExercise(
        userId,
        date,
        exerciseData
      );

      // 業務邏輯：重新計算總卡路里（防止資料不一致）
      updatedWorkout.totalCaloriesBurned = this.calculateTotalCalories(updatedWorkout);

      return updatedWorkout;
    } catch (error) {
      console.error("Service: 新增手動運動時發生業務邏輯錯誤:", error);
      throw new Error("新增手動運動失敗");
    }
  }

  /**
   * 刪除運動
   * 業務邏輯：
   * - 驗證參數完整性
   * - 確認運動記錄存在
   * - 檢查使用者權限
   */
  async deleteExercise(userId: string, date: string, exerciseId: string): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!this.validateDateFormat(date)) {
      throw new Error("日期格式無效，請使用 YYYY-MM-DD 格式");
    }

    if (!exerciseId || exerciseId.trim() === "") {
      throw new Error("運動 ID 不能為空");
    }

    // 業務邏輯：檢查運動記錄是否存在
    const existingWorkout = await this.workoutRepository.findByDate(userId, date);
    if (!existingWorkout) {
      throw new Error("找不到指定日期的運動記錄");
    }

    // 業務邏輯：確認要刪除的運動存在
    const exerciseExists = existingWorkout.manualWorkouts.some(
      (exercise) => exercise.id === exerciseId
    );

    if (!exerciseExists) {
      throw new Error("找不到指定的運動記錄");
    }

    try {
      await this.workoutRepository.deleteExercise(userId, date, exerciseId);
    } catch (error) {
      console.error("Service: 刪除運動時發生業務邏輯錯誤:", error);
      throw new Error("刪除運動失敗");
    }
  }

  /**
   * 更新完整的每日運動記錄
   * 業務邏輯：
   * - 驗證參數完整性
   * - 驗證資料一致性
   * - 重新計算總卡路里
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

    if (!this.validateDateFormat(date)) {
      throw new Error("日期格式無效，請使用 YYYY-MM-DD 格式");
    }

    // 驗證平台資訊
    if (!workoutData.platform || workoutData.platform.trim() === "") {
      throw new Error("平台資訊不能為空");
    }

    // 業務邏輯：驗證日期一致性
    const requestDate = new Date(date);
    const workoutDate = new Date(workoutData.diaryDate);
    
    if (requestDate.toDateString() !== workoutDate.toDateString()) {
      throw new Error("請求日期與運動記錄日期不一致");
    }

    // 業務邏輯：重新計算總卡路里以確保資料一致性
    const calculatedCalories = this.calculateTotalCaloriesFromWorkouts(
      workoutData.manualWorkouts,
      workoutData.healthkitWorkouts
    );

    // 更新總卡路里（允許一定誤差範圍）
    if (Math.abs(workoutData.totalCaloriesBurned - calculatedCalories) > 1) {
      console.warn(
        `總卡路里不一致，調整為計算值: ${workoutData.totalCaloriesBurned} -> ${calculatedCalories}`
      );
      workoutData.totalCaloriesBurned = calculatedCalories;
    }

    try {
      return await this.workoutRepository.updateDailyWorkout(userId, date, workoutData);
    } catch (error) {
      console.error("Service: 更新每日運動記錄時發生業務邏輯錯誤:", error);
      throw new Error("更新每日運動記錄失敗");
    }
  }

  /**
   * 計算運動統計
   */
  async calculateWorkoutStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkoutStats> {
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (startDate > endDate) {
      throw new Error("開始日期不能晚於結束日期");
    }

    try {
      const workouts = await this.workoutRepository.findByUser(userId, startDate);
      
      // 過濾日期範圍內的運動記錄
      const filteredWorkouts = workouts.filter(
        (workout) => workout.diaryDate >= startDate && workout.diaryDate <= endDate
      );

      const totalWorkouts = filteredWorkouts.length;
      const totalCaloriesBurned = filteredWorkouts.reduce(
        (sum, workout) => sum + workout.totalCaloriesBurned,
        0
      );
      const totalDuration = filteredWorkouts.reduce((sum, workout) => {
        return sum + workout.manualWorkouts.reduce(
          (durationSum, exercise) => durationSum + (exercise.duration || 0),
          0
        );
      }, 0);

      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const averageCaloriesPerDay = totalCaloriesBurned / daysDiff;

      // 找到最活躍的一天
      const mostActiveWorkout = filteredWorkouts.reduce(
        (max, workout) => 
          workout.totalCaloriesBurned > max.totalCaloriesBurned ? workout : max,
        filteredWorkouts[0] || { totalCaloriesBurned: 0, diaryDate: new Date() }
      );

      return {
        totalWorkouts,
        totalCaloriesBurned,
        totalDuration,
        averageCaloriesPerDay,
        mostActiveDay: mostActiveWorkout.diaryDate.toISOString().split('T')[0],
      };
    } catch (error) {
      console.error("Service: 計算運動統計時發生業務邏輯錯誤:", error);
      throw new Error("計算運動統計失敗");
    }
  }

  /**
   * 驗證日期格式 (YYYY-MM-DD)
   */
  validateDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * 驗證運動資料的合理性（私有方法）
   */
  private validateExerciseData(exerciseData: AddExerciseRequest): void {
    if (!exerciseData.type || exerciseData.type.trim() === "") {
      throw new Error("運動類型不能為空");
    }

    if (exerciseData.caloriesBurned < 0) {
      throw new Error("消耗卡路里不能為負數");
    }

    if (exerciseData.caloriesBurned > 2000) {
      throw new Error("單次運動消耗卡路里不能超過 2000");
    }

    if (exerciseData.duration !== null && exerciseData.duration < 0) {
      throw new Error("運動時間不能為負數");
    }

    if (exerciseData.duration !== null && exerciseData.duration > 480) {
      throw new Error("單次運動時間不能超過 8 小時");
    }

    if (exerciseData.distance !== undefined && exerciseData.distance !== null && exerciseData.distance < 0) {
      throw new Error("距離不能為負數");
    }

    if (exerciseData.progress < 0 || exerciseData.progress > 100) {
      throw new Error("進度必須在 0-100 之間");
    }
  }

  /**
   * 生成唯一的運動 ID（私有方法）
   */
  private generateExerciseId(): string {
    return `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 計算總卡路里（私有方法）
   */
  private calculateTotalCalories(workout: DailyWorkout): number {
    const manualCalories = workout.manualWorkouts.reduce(
      (sum, exercise) => sum + exercise.caloriesBurned,
      0
    );

    const healthkitCalories = workout.healthkitWorkouts?.reduce(
      (sum, exercise) => sum + exercise.caloriesBurned,
      0
    ) || 0;

    return manualCalories + healthkitCalories;
  }

  /**
   * 從運動陣列計算總卡路里（私有方法）
   */
  private calculateTotalCaloriesFromWorkouts(
    manualWorkouts: any[],
    healthkitWorkouts?: any[]
  ): number {
    const manualCalories = manualWorkouts.reduce(
      (sum, exercise) => sum + (exercise.caloriesBurned || 0),
      0
    );

    const healthkitCalories = healthkitWorkouts?.reduce(
      (sum, exercise) => sum + (exercise.caloriesBurned || 0),
      0
    ) || 0;

    return manualCalories + healthkitCalories;
  }
}