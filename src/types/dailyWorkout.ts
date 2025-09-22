import { z } from "zod";
import { FirestoreDateSchema, TaskStatus, TaskStatusSchema } from "./diary";

// ExerciseData interface - 對應 Flutter 的 ExerciseData
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

// ExerciseData Zod schema
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

// DailyWorkout interface - 對應 Flutter 的每日運動記錄
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

// DailyWorkout Zod schema
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

// 新增運動的請求 schema
export const AddExerciseRequestSchema = z.object({
  id: z.string(),
  type: z.string().min(1, "運動類型不能為空"),
  caloriesBurned: z.number().min(0, "消耗卡路里不能為負數").default(0),
  duration: z.number().min(0, "持續時間不能為負數").nullable().default(0),
  distance: z.number().min(0, "距離不能為負數").nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
});

// 更新完整運動記錄的請求 schema
export const UpdateDailyWorkoutRequestSchema = z.object({
  diaryDate: FirestoreDateSchema,
  totalCaloriesBurned: z.number().min(0, "總消耗卡路里不能為負數").default(0),
  manualWorkouts: z.array(ExerciseDataSchema).default([]),
  healthkitWorkouts: z.array(ExerciseDataSchema).optional(),
  steps: z.number().min(0, "步數不能為負數").optional(),
  platform: z.string().min(1, "平台不能為空"),
});

// 新增運動的請求 interface
export interface AddExerciseRequest {
  id: string;
  type: string;
  caloriesBurned: number;
  duration: number | null;
  distance?: number | null;
  progress: number;
}

// 更新完整運動記錄的請求 interface - 對應前端的 _saveDailyWorkouts
export interface UpdateDailyWorkoutRequest {
  diaryDate: Date;
  totalCaloriesBurned: number;
  manualWorkouts: ExerciseData[];
  healthkitWorkouts?: ExerciseData[];
  steps?: number;
  platform: string;
}

// API 響應 schemas
export const DailyWorkoutResponseSchema = z.object({
  success: z.boolean(),
  result: DailyWorkoutSchema.optional(),
  error: z.string().optional(),
});

export const DailyWorkoutListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(DailyWorkoutSchema).optional(),
  error: z.string().optional(),
});

export const AddExerciseResponseSchema = z.object({
  success: z.boolean(),
  result: DailyWorkoutSchema.optional(),
  error: z.string().optional(),
});

export const DeleteExerciseResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const UpdateDailyWorkoutResponseSchema = z.object({
  success: z.boolean(),
  result: DailyWorkoutSchema.optional(),
  error: z.string().optional(),
});
