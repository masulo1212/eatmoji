import { z } from "zod";
import { DailyWorkout, DailyWorkoutSchema } from "../types/daily-workout.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 取得指定日期運動記錄請求 DTO
 */
export class GetWorkoutByDateDto {
  userId: string;
  date: string; // YYYY-MM-DD 格式

  constructor(data: GetWorkoutByDateDtoType) {
    this.userId = data.userId;
    this.date = data.date;
  }
}

/**
 * 取得指定日期運動記錄響應 DTO
 */
export class GetWorkoutByDateResponseDto extends ApiResponse<DailyWorkout | null> {
  constructor(data: DailyWorkout | null, error?: string) {
    super(data, error);
  }
}

/**
 * 取得指定日期運動記錄請求驗證 Schema
 */
export const GetWorkoutByDateDtoSchema = z.object({
  userId: z.string().min(1, "使用者 ID 不能為空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD"),
});

/**
 * 取得指定日期運動記錄響應驗證 Schema
 */
export const GetWorkoutByDateResponseSchema = z.object({
  success: z.boolean().default(true),
  result: DailyWorkoutSchema.nullable().optional(),
  error: z.string().optional(),
});

/**
 * 取得指定日期運動記錄請求型別
 */
export type GetWorkoutByDateDtoType = z.infer<typeof GetWorkoutByDateDtoSchema>;

/**
 * 取得指定日期運動記錄響應型別
 */
export type GetWorkoutByDateResponseType = z.infer<typeof GetWorkoutByDateResponseSchema>;