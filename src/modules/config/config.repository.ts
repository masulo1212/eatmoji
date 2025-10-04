import { BaseRepository, IFirestoreService, Injectable } from "../../shared";
import { FirebaseConfig, ConfigQueryOptions } from "./types/config.types";

/**
 * Config Repository 介面 - 定義配置資料存取操作
 */
export interface IConfigRepository {
  /**
   * 獲取 Firebase 配置資料
   * @param options 查詢選項
   * @returns FirebaseConfig 物件或 null
   */
  getFirebaseConfig(options?: ConfigQueryOptions): Promise<FirebaseConfig | null>;

  /**
   * 更新 Firebase 配置資料
   * @param config 要更新的配置資料
   */
  updateFirebaseConfig(config: Partial<FirebaseConfig>): Promise<void>;

  /**
   * 檢查配置是否存在
   * @returns 配置是否存在
   */
  configExists(): Promise<boolean>;

  /**
   * 創建預設配置
   * @param config 預設配置資料
   */
  createDefaultConfig(config: FirebaseConfig): Promise<void>;

  /**
   * 獲取強制更新版本
   * @returns 強制更新版本號
   */
  getForceUpdateVersion(): Promise<string>;

  /**
   * 獲取維護狀態
   * @returns 維護狀態物件
   */
  getMaintenanceStatus(): Promise<{ enabled: boolean; endTime?: string }>;
}

/**
 * Firestore Config Repository 實作
 * 繼承 BaseRepository 減少重複程式碼
 */
@Injectable()
export class ConfigRepository extends BaseRepository<FirebaseConfig> implements IConfigRepository {
  private readonly CONFIG_DOC_ID = "config";

  constructor(firestoreService: IFirestoreService) {
    super(firestoreService, "config");
  }

  /**
   * 實作 BaseRepository 抽象方法：從 Firestore 資料轉換為 FirebaseConfig
   */
  fromFirestore(data: any, id?: string): FirebaseConfig {
    return {
      forceUpdateVersion: data.forceUpdateVersion || "1.0.0",
      maintenanceEnabled: data.maintenanceEnabled || false,
      maintenanceEndTime: data.maintenanceEndTime || undefined,
    };
  }

  /**
   * 實作 BaseRepository 抽象方法：將 FirebaseConfig 轉換為 Firestore 資料
   */
  toFirestore(config: FirebaseConfig): any {
    const now = new Date();
    
    return {
      forceUpdateVersion: config.forceUpdateVersion,
      maintenanceEnabled: config.maintenanceEnabled,
      maintenanceEndTime: config.maintenanceEndTime,
      updatedAt: now,
    };
  }

  /**
   * 獲取 Firebase 配置資料
   */
  async getFirebaseConfig(options?: ConfigQueryOptions): Promise<FirebaseConfig | null> {
    try {
      const config = await this.get(this.CONFIG_DOC_ID);
      
      if (!config) {
        console.warn("Repository: Firebase config 文檔不存在，返回預設配置");
        return {
          forceUpdateVersion: "1.0.0",
          maintenanceEnabled: false,
        };
      }

      return config;
    } catch (error) {
      console.error("Repository: 獲取 Firebase 配置時發生錯誤:", error);
      // 返回預設配置而非拋出錯誤，確保系統可用性
      return {
        forceUpdateVersion: "1.0.0",
        maintenanceEnabled: false,
      };
    }
  }

  /**
   * 更新 Firebase 配置資料
   */
  async updateFirebaseConfig(config: Partial<FirebaseConfig>): Promise<void> {
    try {
      await this.update(this.CONFIG_DOC_ID, config);
    } catch (error) {
      console.error("Repository: 更新 Firebase 配置時發生錯誤:", error);
      throw new Error("無法更新 Firebase 配置");
    }
  }

  /**
   * 檢查配置是否存在
   */
  async configExists(): Promise<boolean> {
    try {
      return await this.exists(this.CONFIG_DOC_ID);
    } catch (error) {
      console.error("Repository: 檢查配置是否存在時發生錯誤:", error);
      return false;
    }
  }

  /**
   * 創建預設配置
   */
  async createDefaultConfig(config: FirebaseConfig): Promise<void> {
    try {
      await this.create(this.CONFIG_DOC_ID, config);
    } catch (error) {
      console.error("Repository: 創建預設配置時發生錯誤:", error);
      throw new Error("無法創建預設配置");
    }
  }

  /**
   * 取得強制更新版本（快捷方法）
   */
  async getForceUpdateVersion(): Promise<string> {
    try {
      const config = await this.getFirebaseConfig();
      return config?.forceUpdateVersion || "1.0.0";
    } catch (error) {
      console.error("Repository: 獲取強制更新版本時發生錯誤:", error);
      return "1.0.0";
    }
  }

  /**
   * 取得維修狀態（快捷方法）
   */
  async getMaintenanceStatus(): Promise<{ enabled: boolean; endTime?: string }> {
    try {
      const config = await this.getFirebaseConfig();
      return {
        enabled: config?.maintenanceEnabled || false,
        endTime: config?.maintenanceEndTime,
      };
    } catch (error) {
      console.error("Repository: 獲取維修狀態時發生錯誤:", error);
      return { enabled: false };
    }
  }
}