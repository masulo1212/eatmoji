/**
 * 設定管理工具 - 替代 Remote Config (簡化版)
 * 
 * 由於 AI 報告限制已簡化為只檢查 Pro 狀態，
 * 不再需要複雜的設定管理，保留基本架構以備未來擴展。
 */

// 其他功能設定介面（為未來擴展預留）
export interface AppFeatureConfig {
  /** 示例：某功能的限制設定 */
  // someFeatureLimit: number;
  // someFeatureEnabled: boolean;
}

// 完整應用程式設定介面（簡化版）
export interface AppConfig {
  features: AppFeatureConfig;
}

/**
 * 預設設定值（簡化版）
 */
const DEFAULT_CONFIG: AppConfig = {
  features: {
    // 未來其他功能設定將在這裡擴展
  },
};

/**
 * 設定管理類（簡化版）
 * 
 * 為未來功能擴展保留基本的設定管理架構
 */
export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadFromEnvironment();
  }

  /**
   * 從環境變數載入設定覆蓋值（簡化版）
   * 
   * 目前沒有需要載入的環境變數，保留架構以備未來使用
   */
  private loadFromEnvironment(): void {
    // 未來其他功能的環境變數載入將在這裡實作
  }

  /**
   * 取得完整設定
   */
  get all(): AppConfig {
    return { ...this.config };
  }

  /**
   * 重置為預設設定
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.loadFromEnvironment();
  }

  /**
   * 驗證設定值的有效性（簡化版）
   */
  validate(): boolean {
    // 目前沒有需要驗證的設定，直接返回 true
    // 未來其他功能的設定驗證將在這裡實作
    return true;
  }
}

// 全域設定管理器實例
let configManager: ConfigManager | null = null;

/**
 * 取得全域設定管理器實例（單例模式）
 */
export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
    
    // 驗證設定的有效性
    if (!configManager.validate()) {
      throw new Error('Invalid application configuration detected');
    }
  }
  
  return configManager;
}