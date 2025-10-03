/**
 * Shared Module - 共用模組總匯出
 * 
 * 這個模組包含所有可重用的服務、Repository 基礎類別和型別定義，
 * 為整個應用程式提供一致的基礎設施。
 */

// 型別定義
export * from './types';

// 服務
export * from './services';

// Repository 基礎類別
export * from './repositories';

// 共用模組中繼資料
export const SharedModuleMetadata = {
  moduleName: 'SharedModule',
  version: '1.0.0',
  description: '共用基礎設施模組 - 提供 Firestore 服務和 Repository 基礎類別',
  exports: [
    'IFirestoreService',
    'FirestoreService', 
    'BaseRepository',
    'FirestoreTypes',
    'Injectable'
  ],
  features: [
    '統一的 Firestore 操作介面',
    '可重用的 Repository 基礎類別',
    '型別安全的查詢建構器',
    '錯誤處理和日誌記錄',
    '依賴注入支援'
  ]
} as const;