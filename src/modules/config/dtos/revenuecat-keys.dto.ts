import { z } from "zod";
import { RevenueCatKeysSchema } from "../types/config.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * RevenueCat Keys 請求 DTO - 此端點不需要請求參數
 */
export class GetRevenueCatKeysDto {
  // 此端點不需要任何請求參數
}

/**
 * RevenueCat Keys 響應 DTO
 */
export class RevenueCatKeysResponseDto extends ApiResponse<{
  googleApiKey: string;
  appleApiKey: string;
}> {
  constructor(data: { googleApiKey: string; appleApiKey: string } | null, error?: string) {
    super(data, error);
  }
}

/**
 * RevenueCat Keys 請求驗證 Schema
 */
export const GetRevenueCatKeysDtoSchema = z.object({
  // 無請求參數
});

/**
 * RevenueCat Keys 響應驗證 Schema
 */
export const RevenueCatKeysResponseSchema = z.object({
  success: z.boolean().default(true),
  result: RevenueCatKeysSchema.optional(),
  error: z.string().optional(),
});

/**
 * RevenueCat Keys 請求型別
 */
export type GetRevenueCatKeysDtoType = z.infer<typeof GetRevenueCatKeysDtoSchema>;

/**
 * RevenueCat Keys 響應型別
 */
export type RevenueCatKeysResponseType = z.infer<typeof RevenueCatKeysResponseSchema>;