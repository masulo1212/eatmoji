/**
 * Cloudflare Workers 環境變數和綁定類型定義
 */

/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // 環境變數
  NODE_ENV: "development" | "production";
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_PRIVATE_KEY: string;
  R2_BUCKET_HASH: string;
  
  // Google AI API
  GOOGLE_API_KEY: string;
  
  // Vertex AI
  VERTEX_AI_PROJECT_ID: string;
  VERTEX_AI_LOCATION: string;
  
  // 上傳限制
  TOTAL_UPLOAD_LIMIT_FREE?: number;
  
  // 強制更新版本
  FORCE_UPDATE_VERSION?: string;
  
  // 維修模式
  MAINTENANCE_ENABLED?: boolean;
  MAINTENANCE_END_TIME?: string;
  
  // RevenueCat API Keys
  REVENUECAT_GOOGLE_API_KEY?: string;
  REVENUECAT_APPLE_API_KEY?: string;
  
  // 郵件服務環境變數
  SENDER_EMAIL?: string;
  SENDER_APP_PASSWORD?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_AUTH_USER?: string;
  SENDER_NAME?: string;
  APP_STORE_URL?: string;
  PLAY_STORE_URL?: string;
  ENVIRONMENT?: string;
  
  // R2 Bucket 綁定
  INGREDIENTS_BUCKET: R2Bucket;
}