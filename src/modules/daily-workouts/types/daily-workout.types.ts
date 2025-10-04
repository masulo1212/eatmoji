import { z } from "zod";
import { TaskStatus, TaskStatusSchema } from "../../../types/diary";

// 重新匯出共享的型別
export { TaskStatus, TaskStatusSchema };

// Firestore 日期處理（簡化版）
export const FirestoreDateSchema = z.any().transform((val) => {
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (typeof val === "number") return new Date(val);
  return new Date();
});

/**
 * 運動資料介面
 */
export interface ExerciseData {
  id: string;
  type: string;
  caloriesBurned: number;
  duration: number | null; // 持續時間（分鐘）
  distance?: number | null; // 距離（可選）
  createdAt: Date;
  status: TaskStatus;
  progress: number;
}

/**
 * 每日運動記錄介面
 */
export interface DailyWorkout {
  diaryDate: Date;
  totalCaloriesBurned: number;
  manualWorkouts: ExerciseData[];
  healthkitWorkouts?: ExerciseData[];
  steps?: number;
  platform: string; // 'ios' 或 'android'
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 新增運動請求介面
 */
export interface AddExerciseRequest {
  id: string;
  type: string;
  caloriesBurned: number;
  duration: number | null;
  distance?: number | null;
  progress: number;
}

/**
 * 更新每日運動記錄請求介面
 */
export interface UpdateDailyWorkoutRequest {
  diaryDate: Date;
  totalCaloriesBurned: number;
  manualWorkouts: ExerciseData[];
  healthkitWorkouts?: ExerciseData[];
  steps?: number;
  platform: string;
}

// Zod Schemas

/**
 * ExerciseData Zod schema
 */
export const ExerciseDataSchema = z.object({
  id: z.string(),
  type: z.string(),
  caloriesBurned: z.number().default(0),
  duration: z.number().nullable().default(0),
  distance: z.number().nullable().optional(),
  createdAt: FirestoreDateSchema,
  status: TaskStatusSchema.default(TaskStatus.DONE),
  progress: z.number().default(0),
});

/**
 * DailyWorkout Zod schema
 */
export const DailyWorkoutSchema = z.object({
  diaryDate: FirestoreDateSchema,
  totalCaloriesBurned: z.number().default(0),
  manualWorkouts: z.array(ExerciseDataSchema).default([]),
  healthkitWorkouts: z.array(ExerciseDataSchema).optional(),
  steps: z.number().optional(),
  platform: z.string(),
  createdAt: FirestoreDateSchema,
  updatedAt: FirestoreDateSchema.optional(),
});

/**
 * 新增運動請求 Zod schema
 */
export const AddExerciseRequestSchema = z.object({
  id: z.string(),
  type: z.string().min(1, "運動類型不能為空"),
  caloriesBurned: z.number().min(0, "消耗卡路里不能為負數").default(0),
  duration: z.number().min(0, "持續時間不能為負數").nullable().default(0),
  distance: z.number().min(0, "距離不能為負數").nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
});

/**
 * 更新每日運動記錄請求 Zod schema
 */
export const UpdateDailyWorkoutRequestSchema = z.object({
  diaryDate: FirestoreDateSchema,
  totalCaloriesBurned: z.number().min(0, "總消耗卡路里不能為負數").default(0),
  manualWorkouts: z.array(ExerciseDataSchema).default([]),
  healthkitWorkouts: z.array(ExerciseDataSchema).optional(),
  steps: z.number().min(0, "步數不能為負數").optional(),
  platform: z.string().min(1, "平台不能為空"),
});

/**
 * 查詢選項介面
 */
export interface WorkoutQueryOptions {
  userId: string;
  date?: Date; // 過濾日期
  limit?: number;
  offset?: number;
}

/**
 * 運動統計介面
 */
export interface WorkoutStats {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  totalDuration: number;
  averageCaloriesPerDay: number;
  mostActiveDay: string;
}