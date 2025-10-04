import { z } from "zod";
import { MaintenanceStatusSchema } from "../types/config.types";
import { ApiResponse } from "../../../shared/dtos/api-response.dto";

/**
 * 維修狀態檢查請求 DTO - 此端點不需要請求參數
 */
export class GetMaintenanceStatusDto {
  // 此端點不需要任何請求參數
}

/**
 * 維修狀態檢查響應 DTO
 */
export class MaintenanceStatusResponseDto extends ApiResponse<{
  maintenanceEnabled: boolean;
  maintenanceEndTime?: string;
}> {
  constructor(
    data: {
      maintenanceEnabled: boolean;
      maintenanceEndTime?: string;
    } | null,
    error?: string
  ) {
    super(data, error);
  }
}

/**
 * 維修狀態檢查請求驗證 Schema
 */
export const GetMaintenanceStatusDtoSchema = z.object({
  // 無請求參數
});

/**
 * 維修狀態檢查響應驗證 Schema
 */
export const MaintenanceStatusResponseSchema = z.object({
  success: z.boolean().default(true),
  result: MaintenanceStatusSchema.optional(),
  error: z.string().optional(),
});

/**
 * 維修狀態檢查請求型別
 */
export type GetMaintenanceStatusDtoType = z.infer<typeof GetMaintenanceStatusDtoSchema>;

/**
 * 維修狀態檢查響應型別
 */
export type MaintenanceStatusResponseType = z.infer<typeof MaintenanceStatusResponseSchema>;