/**
 * Cloudflare Workers 環境變數和綁定類型定義
 */

export interface Env {
  // 環境變數
  NODE_ENV: "development" | "production";
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_PRIVATE_KEY: string;
  R2_BUCKET_HASH: string;
  
  // R2 Bucket 綁定
  INGREDIENTS_BUCKET: R2Bucket;
}