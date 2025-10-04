import { z } from "zod";
import {
  AddExerciseRequest,
  AddExerciseRequestSchema,
  DailyWorkout,
  DailyWorkoutSchema,
} from "../types/daily-workout.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 新增運動請求 DTO
 */
export class AddExerciseDto {
  userId: string;
  date: string; // YYYY-MM-DD 格式
  exerciseData: AddExerciseRequest;

  constructor(data: AddExerciseDtoType) {
    this.userId = data.userId;
    this.date = data.date;
    this.exerciseData = data.exerciseData;
  }
}

/**
 * 新增運動響應 DTO
 */
export class AddExerciseResponseDto extends ApiResponse<DailyWorkout> {
  constructor(data: DailyWorkout | null, error?: string) {
    super(data, error);
  }
}

/**
 * 新增運動請求驗證 Schema
 */
export const AddExerciseDtoSchema = z.object({
  userId: z.string().min(1, "使用者 ID 不能為空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD"),
  exerciseData: AddExerciseRequestSchema,
});

/**
 * 新增運動響應驗證 Schema
 */
export const AddExerciseResponseSchema = z.object({
  success: z.boolean().default(true),
  result: DailyWorkoutSchema.optional(),
  error: z.string().optional(),
});

/**
 * 新增運動請求型別
 */
export type AddExerciseDtoType = z.infer<typeof AddExerciseDtoSchema>;

/**
 * 新增運動響應型別
 */
export type AddExerciseResponseType = z.infer<typeof AddExerciseResponseSchema>;