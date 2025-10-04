import { Injectable } from "../../shared";
import { EnvConfig, RevenueCatKeys } from "./types/config.types";

/**
 * Environment Repository 介面 - 定義環境變數存取操作
 */
export interface IEnvRepository {
  /**
   * 獲取 RevenueCat API Keys
   * @returns RevenueCatKeys 物件或 null
   */
  getRevenueCatKeys(): Promise<RevenueCatKeys | null>;

  /**
   * 獲取特定環境變數
   * @param key 環境變數鍵名
   * @returns 環境變數值或 undefined
   */
  getEnvVar(key: keyof EnvConfig): Promise<string | undefined>;

  /**
   * 檢查必要的環境變數是否都已設定
   * @param requiredKeys 必要的環境變數鍵名陣列
   * @returns 檢查結果
   */
  checkRequiredEnvVars(requiredKeys: (keyof EnvConfig)[]): Promise<{
    isValid: boolean;
    missingKeys: string[];
  }>;

  /**
   * 獲取所有環境變數配置
   * @returns 環境變數配置物件
   */
  getAllEnvConfig(): Promise<EnvConfig>;

  /**
   * 驗證 RevenueCat 環境變數
   * @returns 驗證結果
   */
  validateRevenueCatEnv(): Promise<{
    isValid: boolean;
    errors: string[];
  }>;

  /**
   * 記錄環境變數狀態
   */
  logEnvStatus(): Promise<void>;
}

/**
 * Environment Repository 實作
 * 負責存取 Cloudflare Workers 環境變數
 */
@Injectable()
export class EnvRepository implements IEnvRepository {
  private envConfig: EnvConfig;

  constructor(envConfig: EnvConfig) {
    this.envConfig = envConfig;
  }

  /**
   * 獲取 RevenueCat API Keys
   */
  async getRevenueCatKeys(): Promise<RevenueCatKeys | null> {
    try {
      const googleApiKey = this.envConfig.REVENUECAT_GOOGLE_API_KEY;
      const appleApiKey = this.envConfig.REVENUECAT_APPLE_API_KEY;

      // 檢查是否都存在
      if (!googleApiKey || !appleApiKey) {
        console.warn("Repository: RevenueCat API Keys 不完整", {
          hasGoogleKey: !!googleApiKey,
          hasAppleKey: !!appleApiKey,
        });
        return null;
      }

      return {
        googleApiKey,
        appleApiKey,
      };
    } catch (error) {
      console.error("Repository: 獲取 RevenueCat API Keys 時發生錯誤:", error);
      return null;
    }
  }

  /**
   * 獲取特定環境變數
   */
  async getEnvVar(key: keyof EnvConfig): Promise<string | undefined> {
    try {
      return this.envConfig[key];
    } catch (error) {
      console.error(`Repository: 獲取環境變數 ${key} 時發生錯誤:`, error);
      return undefined;
    }
  }

  /**
   * 檢查必要的環境變數是否都已設定
   */
  async checkRequiredEnvVars(requiredKeys: (keyof EnvConfig)[]): Promise<{
    isValid: boolean;
    missingKeys: string[];
  }> {
    try {
      const missingKeys: string[] = [];

      for (const key of requiredKeys) {
        const value = this.envConfig[key];
        if (!value || value.trim() === "") {
          missingKeys.push(key);
        }
      }

      return {
        isValid: missingKeys.length === 0,
        missingKeys,
      };
    } catch (error) {
      console.error("Repository: 檢查環境變數時發生錯誤:", error);
      return {
        isValid: false,
        missingKeys: requiredKeys.map(String),
      };
    }
  }

  /**
   * 獲取所有環境變數配置
   */
  async getAllEnvConfig(): Promise<EnvConfig> {
    return { ...this.envConfig };
  }

  /**
   * 驗證 RevenueCat 環境變數
   */
  async validateRevenueCatEnv(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const requiredKeys: (keyof EnvConfig)[] = [
        "REVENUECAT_GOOGLE_API_KEY",
        "REVENUECAT_APPLE_API_KEY",
      ];

      const checkResult = await this.checkRequiredEnvVars(requiredKeys);
      
      return {
        isValid: checkResult.isValid,
        errors: checkResult.missingKeys.map(key => `缺少必要的環境變數: ${key}`)
      };
    } catch (error) {
      console.error("Repository: 驗證 RevenueCat 環境變數時發生錯誤:", error);
      return {
        isValid: false,
        errors: ["REVENUECAT_GOOGLE_API_KEY 未設定", "REVENUECAT_APPLE_API_KEY 未設定"]
      };
    }
  }

  /**
   * 記錄環境變數狀態（用於除錯）
   */
  async logEnvStatus(): Promise<void> {
    try {
      const validation = await this.validateRevenueCatEnv();
      
      console.log("Repository: 環境變數狀態", {
        revenueCatValid: validation.isValid,
        errors: validation.errors,
        hasGoogleKey: !!this.envConfig.REVENUECAT_GOOGLE_API_KEY,
        hasAppleKey: !!this.envConfig.REVENUECAT_APPLE_API_KEY,
      });
    } catch (error) {
      console.error("Repository: 記錄環境變數狀態時發生錯誤:", error);
    }
  }
}