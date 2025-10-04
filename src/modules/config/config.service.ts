import { Injectable } from "../../shared";
import { IConfigRepository } from "./config.repository";
import { IEnvRepository } from "./env.repository";
import {
  RevenueCatKeys,
  ForceUpdateResult,
  MaintenanceStatus,
  AppConfig,
} from "./types/config.types";

/**
 * Config Service 介面 - 定義業務邏輯操作
 */
export interface IConfigService {
  /**
   * 獲取 RevenueCat API Keys
   * @returns RevenueCat Keys 或錯誤
   */
  getRevenueCatKeys(): Promise<RevenueCatKeys>;

  /**
   * 檢查強制更新
   * @param currentVersion 用戶當前版本
   * @returns 強制更新檢查結果
   */
  checkForceUpdate(currentVersion: string): Promise<ForceUpdateResult>;

  /**
   * 獲取維修狀態
   * @returns 維修狀態
   */
  getMaintenanceStatus(): Promise<MaintenanceStatus>;

  /**
   * 獲取完整應用配置
   * @returns 應用配置
   */
  getAppConfig(): Promise<AppConfig>;

  /**
   * 比較版本
   * @param current 當前版本
   * @param required 要求版本
   * @returns 比較結果：-1, 0, 1
   */
  compareVersions(current: string, required: string): number;
}

/**
 * Config Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理
 */
@Injectable()
export class ConfigService implements IConfigService {
  constructor(
    private configRepository: IConfigRepository,
    private envRepository: IEnvRepository
  ) {}

  /**
   * 獲取 RevenueCat API Keys
   * 業務邏輯：
   * - 從環境變數獲取 Keys
   * - 驗證 Keys 的完整性
   * - 提供有意義的錯誤訊息
   */
  async getRevenueCatKeys(): Promise<RevenueCatKeys> {
    try {
      // 先驗證環境變數
      const validation = await this.envRepository.validateRevenueCatEnv();
      
      if (!validation.isValid) {
        const errors = validation.errors.join(", ");
        throw new Error(`RevenueCat API Keys 配置不完整：${errors}`);
      }

      // 獲取 Keys
      const keys = await this.envRepository.getRevenueCatKeys();
      
      if (!keys) {
        throw new Error("無法獲取 RevenueCat API Keys");
      }

      // 額外的業務邏輯驗證
      if (!this.isValidApiKey(keys.googleApiKey, "goog_")) {
        throw new Error("Google API Key 格式無效");
      }

      if (!this.isValidApiKey(keys.appleApiKey, "appl_")) {
        throw new Error("Apple API Key 格式無效");
      }

      return keys;
    } catch (error) {
      console.error("Service: 獲取 RevenueCat API Keys 時發生業務邏輯錯誤:", error);
      throw new Error(
        error instanceof Error ? error.message : "獲取 RevenueCat API Keys 失敗"
      );
    }
  }

  /**
   * 檢查強制更新
   * 業務邏輯：
   * - 驗證版本格式
   * - 從 Firebase 獲取要求版本
   * - 執行版本比較
   * - 處理邊界情況
   */
  async checkForceUpdate(currentVersion: string): Promise<ForceUpdateResult> {
    try {
      // 驗證版本格式
      if (!this.isValidVersionFormat(currentVersion)) {
        throw new Error("當前版本格式無效，必須為 x.y.z 格式");
      }

      // 獲取要求版本
      const requiredVersion = await this.configRepository.getForceUpdateVersion();

      // 執行版本比較
      const comparisonResult = this.compareVersions(currentVersion, requiredVersion);
      
      // 如果當前版本 < 要求版本，需要強制更新
      const forceUpdate = comparisonResult < 0;

      console.log("Service: 強制更新檢查結果", {
        currentVersion,
        requiredVersion,
        comparisonResult,
        forceUpdate,
      });

      return {
        forceUpdate,
        requiredVersion,
        currentVersion,
      };
    } catch (error) {
      console.error("Service: 檢查強制更新時發生業務邏輯錯誤:", error);
      
      // 業務規則：出錯時不強制更新，避免阻擋用戶
      return {
        forceUpdate: false,
        requiredVersion: "1.0.0",
        currentVersion,
      };
    }
  }

  /**
   * 獲取維修狀態
   * 業務邏輯：
   * - 從 Firebase 獲取維修配置
   * - 處理維修時間格式
   * - 提供預設狀態
   */
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const status = await this.configRepository.getMaintenanceStatus();
      
      // 業務邏輯：清理和格式化維修結束時間
      const result: MaintenanceStatus = {
        maintenanceEnabled: status.enabled,
      };

      if (status.endTime && this.isValidMaintenanceTime(status.endTime)) {
        result.maintenanceEndTime = status.endTime.trim();
      }

      console.log("Service: 維修狀態檢查結果", result);

      return result;
    } catch (error) {
      console.error("Service: 獲取維修狀態時發生業務邏輯錯誤:", error);
      
      // 業務規則：出錯時返回非維修狀態
      return {
        maintenanceEnabled: false,
      };
    }
  }

  /**
   * 獲取完整應用配置
   */
  async getAppConfig(): Promise<AppConfig> {
    try {
      const [revenueCatKeys, forceUpdateVersion, maintenance] = await Promise.all([
        this.getRevenueCatKeys(),
        this.configRepository.getForceUpdateVersion(),
        this.getMaintenanceStatus(),
      ]);

      return {
        revenueCatKeys,
        forceUpdateVersion,
        maintenance,
      };
    } catch (error) {
      console.error("Service: 獲取應用配置時發生業務邏輯錯誤:", error);
      throw new Error("獲取應用配置失敗");
    }
  }

  /**
   * 比較版本字串（語義化版本比較）
   * 對應原始程式碼的 compareVersions 方法
   *
   * @param current 當前版本
   * @param required 要求版本
   * @returns -1 表示 current < required，0 表示相等，1 表示 current > required
   */
  compareVersions(current: string, required: string): number {
    try {
      // 移除版本號中的後綴（如 -dev, -beta 等）
      const cleanVersion = (version: string): string => {
        return version.replace(/-.*$/, "");
      };

      const currentParts = cleanVersion(current)
        .split(".")
        .map((part) => parseInt(part, 10) || 0);

      const requiredParts = cleanVersion(required)
        .split(".")
        .map((part) => parseInt(part, 10) || 0);

      // 補齊版本號至相同長度
      const maxLength = Math.max(currentParts.length, requiredParts.length);

      while (currentParts.length < maxLength) {
        currentParts.push(0);
      }
      while (requiredParts.length < maxLength) {
        requiredParts.push(0);
      }

      // 逐一比較各個版本號段
      for (let i = 0; i < maxLength; i++) {
        if (currentParts[i] < requiredParts[i]) return -1;
        if (currentParts[i] > requiredParts[i]) return 1;
      }

      return 0;
    } catch (error) {
      console.error("Service: 版本比較失敗:", error);
      // 出錯時假設版本相等
      return 0;
    }
  }

  /**
   * 驗證版本格式（私有方法）
   */
  private isValidVersionFormat(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+(-.*)?$/;
    return versionRegex.test(version);
  }

  /**
   * 驗證 API Key 格式（私有方法）
   */
  private isValidApiKey(apiKey: string, prefix: string): boolean {
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }
    
    return apiKey.startsWith(prefix) && apiKey.length > prefix.length + 10;
  }

  /**
   * 驗證維修時間格式（私有方法）
   */
  private isValidMaintenanceTime(timeString: string): boolean {
    if (!timeString || typeof timeString !== "string") {
      return false;
    }
    
    const trimmed = timeString.trim();
    return trimmed.length > 0 && trimmed.length < 100; // 基本長度檢查
  }

  /**
   * 記錄配置狀態（用於除錯）
   */
  async logConfigStatus(): Promise<void> {
    try {
      console.log("Service: 開始記錄配置狀態");
      
      // 記錄環境變數狀態
      await this.envRepository.logEnvStatus();
      
      // 記錄 Firebase 配置狀態
      const configExists = await this.configRepository.configExists();
      console.log("Service: Firebase 配置存在狀態:", configExists);
      
      if (configExists) {
        const firebaseConfig = await this.configRepository.getFirebaseConfig();
        console.log("Service: Firebase 配置內容:", firebaseConfig);
      }
    } catch (error) {
      console.error("Service: 記錄配置狀態時發生錯誤:", error);
    }
  }
}