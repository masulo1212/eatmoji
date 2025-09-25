import { IFcmTokenRepository } from "../repositories/fcmTokenRepository";
import {
  CreateFcmTokenRequest,
  FcmTokenData,
} from "../types/fcmToken";

/**
 * FCM Token Service 介面 - 定義業務邏輯操作
 */
export interface IFcmTokenService {
  /**
   * 註冊或更新 FCM Token
   * @param userId 使用者 ID
   * @param tokenRequest FCM Token 建立請求
   * @returns 註冊的 FcmTokenData 物件
   */
  registerToken(
    userId: string,
    tokenRequest: CreateFcmTokenRequest
  ): Promise<void>;

  /**
   * 刪除特定設備的 Token
   * @param userId 使用者 ID
   * @param deviceId 設備 ID
   */
  removeDeviceToken(userId: string, deviceId: string): Promise<void>;

  /**
   * 獲取使用者所有 FCM Token
   * @param userId 使用者 ID
   * @returns FcmTokenData 陣列
   */
  getUserTokens(userId: string): Promise<FcmTokenData[]>;

  /**
   * 清理過期的 FCM Token
   * @param userId 使用者 ID
   * @param expiredPeriodDays 過期期間（天數）
   * @returns 刪除的 Token 數量
   */
  cleanupExpiredTokens(
    userId: string,
    expiredPeriodDays?: number
  ): Promise<number>;
}

/**
 * FCM Token Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
export class FcmTokenService implements IFcmTokenService {
  constructor(private fcmTokenRepository: IFcmTokenRepository) {}

  /**
   * 註冊或更新 FCM Token
   * 業務邏輯：
   * - 驗證使用者權限
   * - 驗證 Token 格式和必要欄位
   * - 套用預設值和業務規則
   * - 委派給 Repository 執行資料操作
   */
  async registerToken(
    userId: string,
    tokenRequest: CreateFcmTokenRequest
  ): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!tokenRequest.token || tokenRequest.token.trim() === "") {
      throw new Error("FCM Token 不能為空");
    }

    if (!tokenRequest.deviceId || tokenRequest.deviceId.trim() === "") {
      throw new Error("設備 ID 不能為空");
    }

    if (!["ios", "android"].includes(tokenRequest.platform)) {
      throw new Error("平台必須為 ios 或 android");
    }

    // 套用業務規則和預設值
    const now = new Date();
    const tokenData: FcmTokenData = {
      token: tokenRequest.token.trim(),
      deviceId: tokenRequest.deviceId.trim(),
      platform: tokenRequest.platform,
      language: tokenRequest.language || "en",
      appVersion: tokenRequest.appVersion || "1.0.0",
      lastActive: now,
      createdAt: now,
    };

    // 驗證語言代碼格式（基本檢查）
    if (
      tokenData.language &&
      !/^[a-z]{2}(_[A-Z]{2})?(-[a-z]+)?$/.test(tokenData.language)
    ) {
      console.warn(`無效的語言代碼格式: ${tokenData.language}，使用預設值 en`);
      tokenData.language = "en";
    }

    // 驗證版本號格式（基本檢查）
    if (tokenData.appVersion && !/^\d+\.\d+\.\d+/.test(tokenData.appVersion)) {
      console.warn(
        `無效的版本號格式: ${tokenData.appVersion}，使用預設值 1.0.0`
      );
      tokenData.appVersion = "1.0.0";
    }

    try {
      // 委派給 Repository 執行資料註冊
      const registeredToken = await this.fcmTokenRepository.registerToken(
        userId,
        tokenData
      );

      console.log(
        `Service: FCM Token 註冊成功 - 使用者: ${userId}, 設備: ${tokenData.deviceId}, 語言: ${tokenData.language}`
      );

      // return registeredToken;
    } catch (error) {
      console.error("Service: 註冊 FCM Token 時發生業務邏輯錯誤:", error);
      throw new Error("註冊 FCM Token 失敗");
    }
  }

  /**
   * 刪除特定設備的 Token
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能刪除自己的 Token
   */
  async removeDeviceToken(userId: string, deviceId: string): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!deviceId || deviceId.trim() === "") {
      throw new Error("設備 ID 不能為空");
    }

    // 檢查 Token 是否存在且屬於該使用者（安全檢查）
    const existingToken = await this.fcmTokenRepository.getTokenByDeviceId(
      userId,
      deviceId
    );
    if (!existingToken) {
      // 不拋出錯誤，因為可能 Token 已經不存在
      console.log(`Token 不存在或已被刪除: 使用者 ${userId}, 設備 ${deviceId}`);
      return;
    }

    try {
      // 委派給 Repository 執行刪除
      await this.fcmTokenRepository.removeDeviceToken(userId, deviceId);

      console.log(
        `Service: FCM Token 刪除成功 - 使用者: ${userId}, 設備: ${deviceId}`
      );
    } catch (error) {
      console.error("Service: 刪除 FCM Token 時發生業務邏輯錯誤:", error);
      throw new Error("刪除 FCM Token 失敗");
    }
  }

  /**
   * 獲取使用者所有 FCM Token
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則（例如：排序、過濾等）
   */
  async getUserTokens(userId: string): Promise<FcmTokenData[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const tokens = await this.fcmTokenRepository.getUserTokens(userId);

      // 套用業務規則：按最後活躍時間倒序排列
      const sortedTokens = this.applyTokenListBusinessRules(tokens);

      console.log(
        `Service: 取得使用者 ${userId} 的 ${sortedTokens.length} 個 FCM Token`
      );

      return sortedTokens;
    } catch (error) {
      console.error("Service: 取得 FCM Token 列表時發生業務邏輯錯誤:", error);
      throw new Error("取得 FCM Token 列表失敗");
    }
  }


  /**
   * 清理過期的 FCM Token
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用過期期間限制
   * - 記錄清理統計資訊
   */
  async cleanupExpiredTokens(
    userId: string,
    expiredPeriodDays: number = 30
  ): Promise<number> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (expiredPeriodDays <= 0 || expiredPeriodDays > 365) {
      throw new Error("過期期間必須在 1-365 天之間");
    }

    try {
      // 委派給 Repository 執行清理
      const deletedCount = await this.fcmTokenRepository.cleanupExpiredTokens(
        userId,
        expiredPeriodDays
      );

      console.log(
        `Service: 為使用者 ${userId} 清理了 ${deletedCount} 個過期 FCM Token（${expiredPeriodDays} 天未活躍）`
      );

      return deletedCount;
    } catch (error) {
      console.error("Service: 清理過期 FCM Token 時發生業務邏輯錯誤:", error);
      throw new Error("清理過期 FCM Token 失敗");
    }
  }




  /**
   * 套用 Token 列表的業務規則
   * @param tokens 原始 Token 列表
   * @returns 處理後的 Token 列表
   */
  private applyTokenListBusinessRules(tokens: FcmTokenData[]): FcmTokenData[] {
    // 過濾無效 Token
    const validTokens = tokens.filter((token) => {
      return (
        token.token &&
        token.token.trim() !== "" &&
        token.deviceId &&
        token.deviceId.trim() !== ""
      );
    });

    // 按最後活躍時間倒序排列
    return validTokens.sort(
      (a, b) => b.lastActive.getTime() - a.lastActive.getTime()
    );
  }

}
