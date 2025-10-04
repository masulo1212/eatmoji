import { z } from "zod";
import { ForceUpdateResultSchema, VersionSchema } from "../types/config.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 強制更新檢查請求 DTO
 */
export class ForceUpdateCheckDto {
  version: string;

  constructor(data: ForceUpdateCheckDtoType) {
    this.version = data.version;
  }
}

/**
 * 強制更新檢查響應 DTO
 */
export class ForceUpdateCheckResponseDto extends ApiResponse<{
  forceUpdate: boolean;
  requiredVersion: string;
  currentVersion: string;
}> {
  constructor(
    data: {
      forceUpdate: boolean;
      requiredVersion: string;
      currentVersion: string;
    } | null,
    error?: string
  ) {
    super(data, error);
  }
}

/**
 * 強制更新檢查請求驗證 Schema
 */
export const ForceUpdateCheckDtoSchema = z.object({
  version: VersionSchema,
});

/**
 * 強制更新檢查響應驗證 Schema
 */
export const ForceUpdateCheckResponseSchema = z.object({
  success: z.boolean().default(true),
  result: ForceUpdateResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * 強制更新檢查請求型別
 */
export type ForceUpdateCheckDtoType = z.infer<typeof ForceUpdateCheckDtoSchema>;

/**
 * 強制更新檢查響應型別
 */
export type ForceUpdateCheckResponseType = z.infer<typeof ForceUpdateCheckResponseSchema>;