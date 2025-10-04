import { z } from "zod";
import { AppUser, AppUserSchema } from "../types/user.types";

/**
 * 通用 API 響應類別
 */
export class ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;

  constructor(success: boolean, result?: T, error?: string) {
    this.success = success;
    this.result = result;
    this.error = error;
  }

  static success<T>(result?: T): ApiResponse<T> {
    return new ApiResponse(true, result);
  }

  static error<T = undefined>(error: string): ApiResponse<T> {
    return new ApiResponse<T>(false, undefined as any, error);
  }
}

/**
 * 錯誤響應格式
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
}

/**
 * 使用者響應 DTO
 */
export interface UserResponseDto {
  success: true;
  result: AppUser;
}

/**
 * 使用者存在檢查響應 DTO
 */
export interface UserExistsResponseDto {
  success: true;
  result: boolean;
}

/**
 * Zod schemas for API responses
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const UserResponseSchema = z.object({
  success: z.literal(true),
  result: AppUserSchema,
});

export const UserExistsResponseSchema = z.object({
  success: z.literal(true),
  result: z.boolean(),
});