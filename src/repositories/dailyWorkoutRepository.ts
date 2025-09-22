import { FirestoreClient } from "firebase-rest-firestore";
import {
  AddExerciseRequest,
  DailyWorkout,
  ExerciseData,
  UpdateDailyWorkoutRequest,
} from "../types/dailyWorkout";
import { firestoreTimestampToDate, TaskStatus } from "../types/diary";

/**
 * DailyWorkout Repository 介面 - 定義資料存取操作
 */
export interface IDailyWorkoutRepository {
  /**
   * 根據使用者 ID 查詢 daily workout 列表
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns DailyWorkout 陣列
   */
  findByUser(userId: string, date?: Date): Promise<DailyWorkout[]>;

  /**
   * 根據日期查詢單一 daily workout
   * @param userId 使用者 ID
   * @param date 日期
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
 * Firestore DailyWorkout Repository 實作
 */
export class FirestoreDailyWorkoutRepository
  implements IDailyWorkoutRepository
{
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的 daily_workouts collection 參考
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserWorkoutCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/daily_workouts`);
  }

  /**
   * 將 Firestore 文件轉換為 DailyWorkout 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 DailyWorkout 物件
   */
  private convertFirestoreDocToDailyWorkout(doc: any): DailyWorkout {
    const data = doc.data();

    return {
      diaryDate: firestoreTimestampToDate(data.diaryDate),
      totalCaloriesBurned: data.totalCaloriesBurned || 0,
      manualWorkouts: (data.manualWorkouts || []).map((workout: any) => ({
        id: workout.id,
        type: workout.type,
        caloriesBurned: workout.caloriesBurned || 0,
        duration: workout.duration || 0,
        distance: workout.distance,
        createdAt: firestoreTimestampToDate(workout.createdAt),
        status: workout.status || TaskStatus.DONE,
        progress: workout.progress || 0,
      })),
      healthkitWorkouts: data.healthkitWorkouts
        ? (data.healthkitWorkouts || []).map((workout: any) => ({
            id: workout.id,
            type: workout.type,
            caloriesBurned: workout.caloriesBurned || 0,
            duration: workout.duration || 0,
            distance: workout.distance,
            createdAt: firestoreTimestampToDate(workout.createdAt),
            status: workout.status || TaskStatus.DONE,
            progress: workout.progress || 0,
          }))
        : undefined,
      steps: data.steps,
      platform: data.platform || "unknown",
      createdAt: firestoreTimestampToDate(data.createdAt),
      updatedAt: data.updatedAt
        ? firestoreTimestampToDate(data.updatedAt)
        : undefined,
    };
  }

  /**
   * 取得 daily workout 列表，支援可選的日期過濾
   */
  async findByUser(userId: string, date?: Date): Promise<DailyWorkout[]> {
    const collection = this.getUserWorkoutCollection(userId);

    let query: any = collection;

    if (date) {
      query = query.where("diaryDate", ">=", date);
    }

    query = query.orderBy("diaryDate", "desc");

    try {
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) =>
        this.convertFirestoreDocToDailyWorkout(doc)
      );
    } catch (error) {
      console.error("Repository: 取得 daily workout 列表時發生錯誤:", error);
      throw new Error("無法從資料庫取得 daily workout 列表");
    }
  }

  /**
   * 按日期取得單一 daily workout
   */
  async findByDate(userId: string, date: string): Promise<DailyWorkout | null> {
    try {
      const collection = this.getUserWorkoutCollection(userId);
      const doc = await collection.doc(date).get();

      if (!doc.exists) {
        return null;
      }

      return this.convertFirestoreDocToDailyWorkout(doc);
    } catch (error) {
      console.error("Repository: 取得 daily workout 時發生錯誤:", error);
      throw new Error("無法從資料庫取得 daily workout");
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
      const collection = this.getUserWorkoutCollection(userId);
      const docRef = collection.doc(date);
      const doc = await docRef.get();

      const now = new Date();

      const newExercise: ExerciseData = {
        id: exerciseData.id,
        type: exerciseData.type,
        caloriesBurned: exerciseData.caloriesBurned,
        duration: exerciseData.duration,
        distance: exerciseData.distance,
        createdAt: now,
        status: TaskStatus.DONE,
        progress: exerciseData.progress,
      };

      if (doc.exists) {
        // 文件存在，更新現有資料
        const existingData = doc.data();
        if (!existingData) {
          throw new Error("無法取得現有文件資料");
        }
        const existingManualWorkouts = existingData.manualWorkouts || [];
        const newTotalCalories =
          (existingData.totalCaloriesBurned || 0) + exerciseData.caloriesBurned;

        await docRef.update({
          manualWorkouts: [newExercise, ...existingManualWorkouts],
          totalCaloriesBurned: newTotalCalories,
          updatedAt: now,
        });
      } else {
        // 文件不存在，建立新文件
        const newDocData = {
          diaryDate: new Date(date),
          totalCaloriesBurned: exerciseData.caloriesBurned,
          manualWorkouts: [newExercise],
          healthkitWorkouts: [],
          platform: "api",
          createdAt: now,
          updatedAt: now,
        };

        await docRef.set(newDocData);
      }

      // 回傳更新後的資料
      const updatedDoc = await docRef.get();
      return this.convertFirestoreDocToDailyWorkout(updatedDoc);
    } catch (error) {
      console.error("Repository: 新增運動時發生錯誤:", error);
      throw new Error("無法新增運動到資料庫");
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
      const collection = this.getUserWorkoutCollection(userId);
      const docRef = collection.doc(date);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error("找不到指定日期的運動記錄");
      }

      const data = doc.data();
      if (!data) {
        throw new Error("無法取得文件資料");
      }
      const manualWorkouts = data.manualWorkouts || [];
      const healthkitWorkouts = data.healthkitWorkouts || [];

      // 尋找要刪除的運動（先在手動運動中找，再在 HealthKit 運動中找）
      let exerciseToDelete: ExerciseData | null = null;
      let updatedManualWorkouts = manualWorkouts;
      let updatedHealthkitWorkouts = healthkitWorkouts;

      // 在手動運動中尋找
      const manualIndex = manualWorkouts.findIndex(
        (exercise: any) => exercise.id === exerciseId
      );
      if (manualIndex !== -1) {
        exerciseToDelete = manualWorkouts[manualIndex];
        updatedManualWorkouts = manualWorkouts.filter(
          (exercise: any) => exercise.id !== exerciseId
        );
      } else {
        // 在 HealthKit 運動中尋找
        const healthkitIndex = healthkitWorkouts.findIndex(
          (exercise: any) => exercise.id === exerciseId
        );
        if (healthkitIndex !== -1) {
          exerciseToDelete = healthkitWorkouts[healthkitIndex];
          updatedHealthkitWorkouts = healthkitWorkouts.filter(
            (exercise: any) => exercise.id !== exerciseId
          );
        }
      }

      if (!exerciseToDelete) {
        throw new Error("找不到要刪除的運動");
      }

      // 重新計算總卡路里
      const newTotalCalories = Math.max(
        0,
        (data.totalCaloriesBurned || 0) - exerciseToDelete.caloriesBurned
      );

      // 更新文件
      await docRef.update({
        manualWorkouts: updatedManualWorkouts,
        healthkitWorkouts: updatedHealthkitWorkouts,
        totalCaloriesBurned: newTotalCalories,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Repository: 刪除運動時發生錯誤:", error);
      throw new Error("無法刪除運動");
    }
  }

  /**
   * 更新完整的每日運動記錄
   * 對應前端的 _saveDailyWorkouts 邏輯：
   * - 使用 merge 模式更新
   * - 保留現有的 createdAt
   * - 更新 updatedAt 為當前時間
   */
  async updateDailyWorkout(
    userId: string,
    date: string,
    workoutData: UpdateDailyWorkoutRequest
  ): Promise<DailyWorkout> {
    try {
      const collection = this.getUserWorkoutCollection(userId);
      const docRef = collection.doc(date);
      const doc = await docRef.get();

      const now = new Date();

      // 準備更新資料
      const updateData = {
        diaryDate: workoutData.diaryDate,
        totalCaloriesBurned: workoutData.totalCaloriesBurned,
        manualWorkouts: workoutData.manualWorkouts,
        healthkitWorkouts: workoutData.healthkitWorkouts,
        steps: workoutData.steps,
        platform: workoutData.platform,
        updatedAt: now,
      };

      if (doc.exists) {
        // 文件存在，保留原有的 createdAt
        const existingData = doc.data();
        if (!existingData) {
          throw new Error("無法取得現有文件資料");
        }

        const finalData = {
          ...updateData,
          createdAt: existingData.createdAt || now, // 保留現有 createdAt
        };

        await docRef.set(finalData, { merge: true } as any);
      } else {
        // 文件不存在，創建新文件
        const finalData = {
          ...updateData,
          createdAt: now,
        };

        await docRef.set(finalData);
      }

      // 回傳更新後的資料
      const updatedDoc = await docRef.get();
      return this.convertFirestoreDocToDailyWorkout(updatedDoc);
    } catch (error) {
      console.error("Repository: 更新完整運動記錄時發生錯誤:", error);
      throw new Error("無法更新完整運動記錄");
    }
  }
}
