import { z } from "zod";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 刪除運動請求 DTO
 */
export class DeleteExerciseDto {
  userId: string;
  date: string; // YYYY-MM-DD 格式
  exerciseId: string;

  constructor(data: DeleteExerciseDtoType) {
    this.userId = data.userId;
    this.date = data.date;
    this.exerciseId = data.exerciseId;
  }
}

/**
 * 刪除運動響應 DTO
 */
export class DeleteExerciseResponseDto extends ApiResponse<void> {
  constructor(error?: string) {
    super(null, error);
  }
}

/**
 * 刪除運動請求驗證 Schema
 */
export const DeleteExerciseDtoSchema = z.object({
  userId: z.string().min(1, "使用者 ID 不能為空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD"),
  exerciseId: z.string().min(1, "運動 ID 不能為空"),
});

/**
 * 刪除運動響應驗證 Schema
 */
export const DeleteExerciseResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional(),
});

/**
 * 刪除運動請求型別
 */
export type DeleteExerciseDtoType = z.infer<typeof DeleteExerciseDtoSchema>;

/**
 * 刪除運動響應型別
 */
export type DeleteExerciseResponseType = z.infer<typeof DeleteExerciseResponseSchema>;