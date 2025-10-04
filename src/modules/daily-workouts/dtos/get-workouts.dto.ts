import { z } from "zod";
import { DailyWorkout, DailyWorkoutSchema } from "../types/daily-workout.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 取得運動列表請求 DTO
 */
export class GetWorkoutsDto {
  userId: string;
  date?: string; // YYYY-MM-DD 格式

  constructor(data: GetWorkoutsDtoType) {
    this.userId = data.userId;
    this.date = data.date;
  }
}

/**
 * 取得運動列表響應 DTO
 */
export class GetWorkoutsResponseDto extends ApiResponse<DailyWorkout[]> {
  constructor(data: DailyWorkout[] | null, error?: string) {
    super(data, error);
  }
}

/**
 * 取得運動列表請求驗證 Schema
 */
export const GetWorkoutsDtoSchema = z.object({
  userId: z.string().min(1, "使用者 ID 不能為空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD").optional(),
});

/**
 * 取得運動列表響應驗證 Schema
 */
export const GetWorkoutsResponseSchema = z.object({
  success: z.boolean().default(true),
  result: z.array(DailyWorkoutSchema).optional(),
  error: z.string().optional(),
});

/**
 * 取得運動列表請求型別
 */
export type GetWorkoutsDtoType = z.infer<typeof GetWorkoutsDtoSchema>;

/**
 * 取得運動列表響應型別
 */
export type GetWorkoutsResponseType = z.infer<typeof GetWorkoutsResponseSchema>;