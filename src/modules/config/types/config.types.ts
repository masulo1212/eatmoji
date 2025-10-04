import { z } from "zod";

/**
 * RevenueCat API Keys 型別
 */
export interface RevenueCatKeys {
  googleApiKey: string;
  appleApiKey: string;
}

/**
 * 強制更新檢查結果
 */
export interface ForceUpdateResult {
  forceUpdate: boolean;
  requiredVersion: string;
  currentVersion: string;
}

/**
 * 維修狀態檢查結果
 */
export interface MaintenanceStatus {
  maintenanceEnabled: boolean;
  maintenanceEndTime?: string;
}

/**
 * Firebase Config 文檔結構
 */
export interface FirebaseConfig {
  forceUpdateVersion?: string;
  maintenanceEnabled?: boolean;
  maintenanceEndTime?: string;
}

/**
 * 應用程式配置（包含所有配置項目）
 */
export interface AppConfig {
  revenueCatKeys: RevenueCatKeys;
  forceUpdateVersion: string;
  maintenance: MaintenanceStatus;
}

// Zod Schemas

/**
 * RevenueCat Keys Schema
 */
export const RevenueCatKeysSchema = z.object({
  googleApiKey: z.string().describe("RevenueCat Google API Key"),
  appleApiKey: z.string().describe("RevenueCat Apple API Key"),
});

/**
 * 強制更新結果 Schema
 */
export const ForceUpdateResultSchema = z.object({
  forceUpdate: z.boolean().describe("是否需要強制更新"),
  requiredVersion: z.string().describe("最低要求版本"),
  currentVersion: z.string().describe("用戶當前版本"),
});

/**
 * 維修狀態 Schema
 */
export const MaintenanceStatusSchema = z.object({
  maintenanceEnabled: z.boolean().describe("是否正在維修"),
  maintenanceEndTime: z.string().optional().describe("維修結束時間（可選）"),
});

/**
 * Firebase Config Schema
 */
export const FirebaseConfigSchema = z.object({
  forceUpdateVersion: z.string().optional(),
  maintenanceEnabled: z.boolean().optional(),
  maintenanceEndTime: z.string().optional(),
});

/**
 * 版本號驗證 Schema
 */
export const VersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+/, "版本格式必須為 x.y.z")
  .describe("應用程式版本號，格式：x.y.z（如：1.2.3）");

/**
 * 環境變數配置
 */
export interface EnvConfig {
  REVENUECAT_GOOGLE_API_KEY?: string;
  REVENUECAT_APPLE_API_KEY?: string;
}

/**
 * Config Repository 查詢選項
 */
export interface ConfigQueryOptions {
  useCache?: boolean;
  timeout?: number;
}