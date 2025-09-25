import { 
  CreateFcmTokenRequest,
  ApiResponse,
  FcmTokenListResponse,
  DeleteTokensResponse
} from "../types/fcmToken";
import { IFcmTokenService } from "../services/fcmTokenService";

/**
 * FCM Token Service 介面 - 供 Controller 使用
 */
export interface IFcmTokenControllerService extends IFcmTokenService {}

/**
 * API 錯誤響應格式
 */
export interface ApiErrorResponse {
  success: false;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

/**
 * FCM Token Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class FcmTokenController {
  constructor(private fcmTokenService: IFcmTokenControllerService) {}

  /**
   * 註冊或更新 FCM Token
   * @param userId 使用者 ID
   * @param tokenRequest FCM Token 建立請求
   * @returns API 響應格式
   */
  async registerToken(
    userId: string,
    tokenRequest: CreateFcmTokenRequest
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!tokenRequest.token?.trim()) {
        return {
          success: false,
          error: "FCM Token 不能為空",
        };
      }

      if (!tokenRequest.deviceId?.trim()) {
        return {
          success: false,
          error: "設備 ID 不能為空",
        };
      }

      if (!["ios", "android"].includes(tokenRequest.platform)) {
        return {
          success: false,
          error: "平台必須為 ios 或 android",
        };
      }

      // 調用 Service 層
      await this.fcmTokenService.registerToken(userId, tokenRequest);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 註冊 FCM Token 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "註冊 FCM Token 時發生未知錯誤",
      };
    }
  }

  /**
   * 刪除特定設備的 Token
   * @param userId 使用者 ID
   * @param deviceId 設備 ID
   * @returns API 響應格式
   */
  async removeDeviceToken(
    userId: string,
    deviceId: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!deviceId?.trim()) {
        return {
          success: false,
          error: "設備 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.fcmTokenService.removeDeviceToken(userId, deviceId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 刪除 FCM Token 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "刪除 FCM Token 時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取使用者所有 FCM Token
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getUserTokens(userId: string): Promise<FcmTokenListResponse> {
    try {
      // 調用 Service 層
      const tokens = await this.fcmTokenService.getUserTokens(userId);

      return {
        success: true,
        result: tokens,
      };
    } catch (error) {
      console.error("Controller: 取得 FCM Token 列表失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得 FCM Token 列表時發生未知錯誤",
      };
    }
  }


  /**
   * 清理過期的 FCM Token
   * @param userId 使用者 ID
   * @param expiredDaysString 過期期間（天數）字串
   * @returns API 響應格式
   */
  async cleanupExpiredTokens(
    userId: string,
    expiredDaysString?: string
  ): Promise<DeleteTokensResponse> {
    try {
      // 驗證和轉換過期天數參數
      let expiredDays = 30; // 預設 30 天
      if (expiredDaysString) {
        const parsedDays = parseInt(expiredDaysString, 10);
        if (isNaN(parsedDays) || parsedDays <= 0 || parsedDays > 365) {
          return {
            success: false,
            error: "過期期間必須為 1-365 之間的整數",
          };
        }
        expiredDays = parsedDays;
      }

      // 調用 Service 層
      const deletedCount = await this.fcmTokenService.cleanupExpiredTokens(userId, expiredDays);

      return {
        success: true,
        result: { deletedCount },
      };
    } catch (error) {
      console.error("Controller: 清理過期 FCM Token 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "清理過期 FCM Token 時發生未知錯誤",
      };
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
  ): ApiErrorResponse {
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