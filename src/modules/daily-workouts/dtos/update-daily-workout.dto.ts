import { z } from "zod";
import {
  UpdateDailyWorkoutRequest,
  UpdateDailyWorkoutRequestSchema,
  DailyWorkout,
  DailyWorkoutSchema,
} from "../types/daily-workout.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 更新每日運動記錄請求 DTO
 */
export class UpdateDailyWorkoutDto {
  userId: string;
  date: string; // YYYY-MM-DD 格式
  workoutData: UpdateDailyWorkoutRequest;

  constructor(data: UpdateDailyWorkoutDtoType) {
    this.userId = data.userId;
    this.date = data.date;
    this.workoutData = data.workoutData;
  }
}

/**
 * 更新每日運動記錄響應 DTO
 */
export class UpdateDailyWorkoutResponseDto extends ApiResponse<DailyWorkout> {
  constructor(data: DailyWorkout | null, error?: string) {
    super(data, error);
  }
}

/**
 * 更新每日運動記錄請求驗證 Schema
 */
export const UpdateDailyWorkoutDtoSchema = z.object({
  userId: z.string().min(1, "使用者 ID 不能為空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD"),
  workoutData: UpdateDailyWorkoutRequestSchema,
});

/**
 * 更新每日運動記錄響應驗證 Schema
 */
export const UpdateDailyWorkoutResponseSchema = z.object({
  success: z.boolean().default(true),
  result: DailyWorkoutSchema.optional(),
  error: z.string().optional(),
});

/**
 * 更新每日運動記錄請求型別
 */
export type UpdateDailyWorkoutDtoType = z.infer<typeof UpdateDailyWorkoutDtoSchema>;

/**
 * 更新每日運動記錄響應型別
 */
export type UpdateDailyWorkoutResponseType = z.infer<typeof UpdateDailyWorkoutResponseSchema>;