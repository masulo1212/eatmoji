import { BaseRepository, IFirestoreService, Injectable } from "../../shared";
import {
  DailyWorkout,
  ExerciseData,
  AddExerciseRequest,
  UpdateDailyWorkoutRequest,
  WorkoutQueryOptions,
  TaskStatus,
} from "./types/daily-workout.types";
import { QueryConfig } from "../../shared/types/firestore.types";

/**
 * DailyWorkout Repository 介面 - 定義運動資料存取操作
 */
export interface IDailyWorkoutRepository {
  /**
   * 根據使用者 ID 查詢運動列表
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns DailyWorkout 陣列
   */
  findByUser(userId: string, date?: Date): Promise<DailyWorkout[]>;

  /**
   * 根據日期查詢單一運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns DailyWorkout 物件或 null
   */
  findByDate(userId: string, date: string): Promise<DailyWorkout | null>;

  /**
   * 新增手動運動到指定日期
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
   * 刪除指定的運動
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
   * 檢查運動記錄是否存在
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns 是否存在
   */
  workoutExists(userId: string, date: string): Promise<boolean>;

  /**
   * 創建新的運動記錄
   * @param userId 使用者 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @param workoutData 初始運動資料
   * @returns 創建的 DailyWorkout 物件
   */
  createWorkout(
    userId: string,
    date: string,
    workoutData: Partial<DailyWorkout>
  ): Promise<DailyWorkout>;
}

/**
 * Firestore DailyWorkout Repository 實作
 * 繼承 BaseRepository 減少重複程式碼
 */
@Injectable()
export class DailyWorkoutRepository
  extends BaseRepository<DailyWorkout>
  implements IDailyWorkoutRepository
{
  constructor(firestoreService: IFirestoreService) {
    super(firestoreService, "dailyWorkouts");
  }

  /**
   * 實作 BaseRepository 抽象方法：從 Firestore 資料轉換為 DailyWorkout
   */
  fromFirestore(data: any, id?: string): DailyWorkout {
    const convertExerciseData = (exercise: any): ExerciseData => ({
      id: exercise.id || "",
      type: exercise.type || "",
      caloriesBurned: exercise.caloriesBurned || 0,
      duration: exercise.duration,
      distance: exercise.distance,
      createdAt: this.convertFirestoreTimestamp(exercise.createdAt),
      status: exercise.status || TaskStatus.DONE,
      progress: exercise.progress || 0,
    });

    return {
      diaryDate: this.convertFirestoreTimestamp(data.diaryDate),
      totalCaloriesBurned: data.totalCaloriesBurned || 0,
      manualWorkouts: (data.manualWorkouts || []).map(convertExerciseData),
      healthkitWorkouts: data.healthkitWorkouts?.map(convertExerciseData),
      steps: data.steps,
      platform: data.platform || "unknown",
      createdAt: this.convertFirestoreTimestamp(data.createdAt),
      updatedAt: data.updatedAt
        ? this.convertFirestoreTimestamp(data.updatedAt)
        : undefined,
    };
  }

  /**
   * 實作 BaseRepository 抽象方法：將 DailyWorkout 轉換為 Firestore 資料
   */
  toFirestore(workout: DailyWorkout): any {
    const now = new Date();

    return {
      diaryDate: workout.diaryDate,
      totalCaloriesBurned: workout.totalCaloriesBurned,
      manualWorkouts: workout.manualWorkouts,
      healthkitWorkouts: workout.healthkitWorkouts,
      steps: workout.steps,
      platform: workout.platform,
      createdAt: workout.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * 根據使用者 ID 查詢運動列表
   */
  async findByUser(userId: string, date?: Date): Promise<DailyWorkout[]> {
    try {
      // 建構正確的子集合路徑
      const collectionPath = `users/${userId}/daily_workouts`;
      
      const queryConfig: QueryConfig = {
        orderBy: [
          {
            field: "diaryDate",
            direction: "desc",
          },
        ],
        limit: 50, // 預設限制 50 筆
      };

      // 如果有日期過濾條件
      if (date) {
        queryConfig.conditions = [
          {
            field: "diaryDate",
            operator: ">=",
            value: date,
          }
        ];
      }

      // 直接使用 firestoreService 查詢子集合
      const results = await this.firestoreService.queryDocuments(
        collectionPath,
        queryConfig
      );

      return results.map((doc) => this.fromFirestore(doc, doc.id));
    } catch (error) {
      console.error("Repository: 查詢使用者運動列表時發生錯誤:", error);
      throw new Error("無法查詢運動列表");
    }
  }

  /**
   * 根據日期查詢單一運動記錄
   */
  async findByDate(userId: string, date: string): Promise<DailyWorkout | null> {
    try {
      const collectionPath = `users/${userId}/daily_workouts`;
      const docId = this.buildWorkoutDocId(date);
      
      const result = await this.firestoreService.getDocument(collectionPath, docId);
      
      if (!result) {
        return null;
      }
      
      return this.fromFirestore(result, docId);
    } catch (error) {
      console.error("Repository: 查詢指定日期運動記錄時發生錯誤:", error);
      return null;
    }
  }

  /**
   * 新增手動運動到指定日期
   */
  async addManualExercise(
    userId: string,
    date: string,
    exerciseData: AddExerciseRequest
  ): Promise<DailyWorkout> {
    try {
      const collectionPath = `users/${userId}/daily_workouts`;
      const docId = this.buildWorkoutDocId(date);
      let workout = await this.findByDate(userId, date);

      if (!workout) {
        // 如果不存在，創建新的運動記錄
        workout = {
          diaryDate: new Date(date),
          totalCaloriesBurned: 0,
          manualWorkouts: [],
          platform: "web",
          createdAt: new Date(),
        };
      }

      // 新增運動資料
      const newExercise: ExerciseData = {
        ...exerciseData,
        createdAt: new Date(),
        status: TaskStatus.DONE,
      };

      workout.manualWorkouts.push(newExercise);
      workout.totalCaloriesBurned += exerciseData.caloriesBurned;
      workout.updatedAt = new Date();

      // 轉換為 Firestore 格式並更新
      const firestoreData = this.toFirestore(workout);
      await this.firestoreService.setDocument(collectionPath, docId, firestoreData);

      return workout;
    } catch (error) {
      console.error("Repository: 新增手動運動時發生錯誤:", error);
      throw new Error("無法新增手動運動");
    }
  }

  /**
   * 刪除指定的運動
   */
  async deleteExercise(
    userId: string,
    date: string,
    exerciseId: string
  ): Promise<void> {
    try {
      const docId = this.buildWorkoutDocId(date);
      const workout = await this.findByDate(userId, date);

      if (!workout) {
        throw new Error("找不到指定日期的運動記錄");
      }

      // 找到並移除指定的運動
      const exerciseIndex = workout.manualWorkouts.findIndex(
        (exercise) => exercise.id === exerciseId
      );

      if (exerciseIndex === -1) {
        throw new Error("找不到指定的運動記錄");
      }

      const removedExercise = workout.manualWorkouts[exerciseIndex];
      workout.manualWorkouts.splice(exerciseIndex, 1);
      workout.totalCaloriesBurned -= removedExercise.caloriesBurned;
      workout.updatedAt = new Date();

      // 更新到 Firestore
      const collectionPath = `users/${userId}/daily_workouts`;
      const firestoreData = this.toFirestore(workout);
      await this.firestoreService.setDocument(collectionPath, docId, firestoreData);
    } catch (error) {
      console.error("Repository: 刪除運動時發生錯誤:", error);
      throw new Error("無法刪除運動");
    }
  }

  /**
   * 更新完整的每日運動記錄
   */
  async updateDailyWorkout(
    userId: string,
    date: string,
    workoutData: UpdateDailyWorkoutRequest
  ): Promise<DailyWorkout> {
    try {
      const collectionPath = `users/${userId}/daily_workouts`;
      const docId = this.buildWorkoutDocId(date);
      const now = new Date();

      const workout: DailyWorkout = {
        ...workoutData,
        createdAt: now,
        updatedAt: now,
      };

      const firestoreData = this.toFirestore(workout);
      await this.firestoreService.setDocument(collectionPath, docId, firestoreData);
      
      return workout;
    } catch (error) {
      console.error("Repository: 更新每日運動記錄時發生錯誤:", error);
      throw new Error("無法更新每日運動記錄");
    }
  }

  /**
   * 檢查運動記錄是否存在
   */
  async workoutExists(userId: string, date: string): Promise<boolean> {
    try {
      const collectionPath = `users/${userId}/daily_workouts`;
      const docId = this.buildWorkoutDocId(date);
      
      const result = await this.firestoreService.getDocument(collectionPath, docId);
      return result !== null;
    } catch (error) {
      console.error("Repository: 檢查運動記錄是否存在時發生錯誤:", error);
      return false;
    }
  }

  /**
   * 創建新的運動記錄
   */
  async createWorkout(
    userId: string,
    date: string,
    workoutData: Partial<DailyWorkout>
  ): Promise<DailyWorkout> {
    try {
      const docId = this.buildWorkoutDocId(date);
      const now = new Date();

      const workout: DailyWorkout = {
        diaryDate: new Date(date),
        totalCaloriesBurned: 0,
        manualWorkouts: [],
        platform: "web",
        createdAt: now,
        updatedAt: now,
        ...workoutData,
      };

      const collectionPath = `users/${userId}/daily_workouts`;
      const firestoreData = this.toFirestore(workout);
      await this.firestoreService.setDocument(collectionPath, docId, firestoreData);
      
      return workout;
    } catch (error) {
      console.error("Repository: 創建運動記錄時發生錯誤:", error);
      throw new Error("無法創建運動記錄");
    }
  }

  /**
   * 建構運動記錄文檔 ID
   * @param date 日期字串 (YYYY-MM-DD)
   * @returns 文檔 ID
   */
  private buildWorkoutDocId(date: string): string {
    return `workout_${date.replace(/-/g, "")}`;
  }

  /**
   * 轉換 Firestore 時間戳為 Date
   * @param timestamp Firestore 時間戳
   * @returns Date 物件
   */
  private convertFirestoreTimestamp(timestamp: any): Date {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === "string") return new Date(timestamp);
    if (typeof timestamp === "number") return new Date(timestamp);

    // Firestore Timestamp 物件
    if (timestamp && timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    }

    // Firebase Timestamp 物件
    if (timestamp && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }

    return new Date();
  }
}