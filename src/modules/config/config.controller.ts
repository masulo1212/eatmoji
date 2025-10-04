import {
  Controller,
  Get,
  ToArguments,
  ToResponse,
} from "@asla/hono-decorator";
import { Context } from "hono";
import { IConfigService } from "./config.service";
import { ApiResponse } from "../../shared/dtos/api-response.dto";
import {
  ForceUpdateCheckDto,
  ForceUpdateCheckResponseDto,
} from "./dtos/force-update.dto";
import {
  RevenueCatKeysResponseDto,
} from "./dtos/revenuecat-keys.dto";
import {
  MaintenanceStatusResponseDto,
} from "./dtos/maintenance.dto";
import {
  RevenueCatKeys,
  ForceUpdateResult,
  MaintenanceStatus,
} from "./types/config.types";

/**
 * Config Controller - 使用裝飾器版本
 * 處理配置相關的 HTTP 請求
 */
@Controller({ basePath: "/config" })
export class ConfigController {
  constructor(private configService: IConfigService) {}

  /**
   * 獲取 RevenueCat API Keys
   * GET /config/revenuecat-keys
   */
  @ToArguments(async (ctx: Context) => {
    // 此端點不需要任何參數
    return [];
  })
  @ToResponse((data: ApiResponse<RevenueCatKeys>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 500);
    }
  })
  @Get("/revenuecat-keys")
  async getRevenueCatKeys(): Promise<ApiResponse<RevenueCatKeys>> {
    try {
      const keys = await this.configService.getRevenueCatKeys();
      return ApiResponse.success(keys);
    } catch (error) {
      console.error("Controller: 獲取 RevenueCat Keys 失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "獲取 RevenueCat Keys 時發生未知錯誤"
      );
    }
  }

  /**
   * 檢查強制更新
   * GET /config/force-update-check?version=x.y.z
   */
  @ToArguments(async (ctx: Context) => {
    const version = ctx.req.query("version");
    if (!version) {
      throw new Error("版本參數缺失");
    }

    // 創建並驗證 DTO
    const dto = new ForceUpdateCheckDto({ version });
    return [dto];
  })
  @ToResponse((data: ApiResponse<ForceUpdateResult>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/force-update-check")
  async checkForceUpdate(
    dto: ForceUpdateCheckDto
  ): Promise<ApiResponse<ForceUpdateResult>> {
    try {
      const result = await this.configService.checkForceUpdate(dto.version);
      return ApiResponse.success(result);
    } catch (error) {
      console.error("Controller: 檢查強制更新失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "檢查強制更新時發生未知錯誤"
      );
    }
  }

  /**
   * 獲取維修狀態
   * GET /config/maintenance-check
   */
  @ToArguments(async (ctx: Context) => {
    // 此端點不需要任何參數
    return [];
  })
  @ToResponse((data: ApiResponse<MaintenanceStatus>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 500);
    }
  })
  @Get("/maintenance-check")
  async getMaintenanceStatus(): Promise<ApiResponse<MaintenanceStatus>> {
    try {
      const status = await this.configService.getMaintenanceStatus();
      return ApiResponse.success(status);
    } catch (error) {
      console.error("Controller: 獲取維修狀態失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "獲取維修狀態時發生未知錯誤"
      );
    }
  }

  /**
   * 獲取完整應用配置（附加端點）
   * GET /config/app-config
   */
  @ToArguments(async (ctx: Context) => {
    // 此端點不需要任何參數
    return [];
  })
  @ToResponse((data: ApiResponse<any>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 500);
    }
  })
  @Get("/app-config")
  async getAppConfig(): Promise<ApiResponse<any>> {
    try {
      const config = await this.configService.getAppConfig();
      return ApiResponse.success(config);
    } catch (error) {
      console.error("Controller: 獲取應用配置失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "獲取應用配置時發生未知錯誤"
      );
    }
  }

  /**
   * 獲取配置狀態（除錯用端點）
   * GET /config/status
   */
  @ToArguments(async (ctx: Context) => {
    // 此端點不需要任何參數
    return [];
  })
  @ToResponse((data: ApiResponse<any>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 500);
    }
  })
  @Get("/status")
  async getConfigStatus(): Promise<ApiResponse<any>> {
    try {
      // 返回基本狀態信息
      const status = {
        timestamp: new Date().toISOString(),
        message: "Config 模組運行正常",
        version: "2.0.0",
      };
      
      return ApiResponse.success(status);
    } catch (error) {
      console.error("Controller: 獲取配置狀態失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "獲取配置狀態時發生未知錯誤"
      );
    }
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ) {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }
}