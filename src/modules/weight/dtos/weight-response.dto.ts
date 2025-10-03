import { z } from "zod";
import { WeightEntry } from "../types/weight.types";

/**
 * 通用 API 響應格式
 */
export class ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;

  constructor(data: ApiResponse<T>) {
    this.success = data.success;
    this.result = data.result;
    this.error = data.error;
  }

  /**
   * 建立成功響應
   */
  static success<T>(result?: T): ApiResponse<T> {
    return new ApiResponse({
      success: true,
      result,
    });
  }

  /**
   * 建立錯誤響應
   */
  static error<T>(error: string): ApiResponse<T> {
    return new ApiResponse({
      success: false,
      error,
    });
  }
}

/**
 * API 錯誤響應格式
 */
export class ApiErrorResponse {
  success: false;
  errors: Array<{
    code: number;
    message: string;
  }>;

  constructor(errors: Array<{ code: number; message: string }>) {
    this.success = false;
    this.errors = errors;
  }
}

/**
 * 體重記錄響應 DTO
 */
export class WeightEntryResponseDto {
  success: boolean;
  result?: WeightEntry;
  error?: string;

  constructor(data: WeightEntryResponseDto) {
    this.success = data.success;
    this.result = data.result;
    this.error = data.error;
  }
}

/**
 * 體重記錄列表響應 DTO
 */
export class WeightEntryListResponseDto {
  success: boolean;
  result?: WeightEntry[];
  error?: string;

  constructor(data: WeightEntryListResponseDto) {
    this.success = data.success;
    this.result = data.result;
    this.error = data.error;
  }
}

// Zod schemas for validation
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  errors: z.array(
    z.object({
      code: z.number(),
      message: z.string(),
    })
  ),
});

export const WeightEntryResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(), // 將在 weight.types.ts 中定義具體的 WeightEntry schema
  error: z.string().optional(),
});

export const WeightEntryListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(z.any()).optional(), // 將在 weight.types.ts 中定義具體的 WeightEntry schema
  error: z.string().optional(),
});