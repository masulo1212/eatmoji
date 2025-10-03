/**
 * Weight Module - 體重管理模組
 * 
 * 這個模組採用類似 NestJS 的架構設計，使用 @asla/hono-decorator
 * 提供裝飾器支援，實現模組化的體重記錄管理功能。
 * 
 * 模組結構：
 * - Controller: 處理 HTTP 請求和響應
 * - Service: 實作業務邏輯
 * - Repository: 處理資料存取
 * - DTOs: 資料傳輸物件
 * - Types: 型別定義
 * 
 * 使用方式：
 * ```typescript
 * import { WeightModule } from './modules/weight';
 * 
 * // 註冊模組到 Hono 應用程式
 * WeightModule.register(app, { firestore });
 * ```
 */

// 主要模組匯出
export { WeightModule } from './weight.module';

// 控制器匯出
export { WeightController } from './weight.controller';

// 服務層匯出
export { WeightService, IWeightService } from './weight.service';

// 存儲庫層匯出
export { WeightRepository, IWeightRepository, Injectable } from './weight.repository';

// DTO 匯出
export { CreateWeightDto, CreateWeightDtoSchema, CreateWeightDtoType } from './dtos/create-weight.dto';
export { WeightQueryDto, WeightQueryDtoSchema, WeightQueryDtoType } from './dtos/weight-query.dto';
export { 
  ApiResponse, 
  ApiErrorResponse, 
  WeightEntryResponseDto, 
  WeightEntryListResponseDto,
  ApiResponseSchema,
  ApiErrorResponseSchema,
  WeightEntryResponseSchema,
  WeightEntryListResponseSchema
} from './dtos/weight-response.dto';

// 型別匯出
export {
  WeightEntry,
  DataSource,
  DataSourceSchema,
  firestoreTimestampToDate,
  dateToFirestoreTimestamp,
  FirestoreDateSchema,
  WeightEntrySchema,
  CreateWeightEntrySchema,
  UpdateWeightEntrySchema,
  WeightQuerySchema
} from './types/weight.types';

// 模組中繼資料匯出（用於其他模組參考）
export const WeightModuleMetadata = {
  moduleName: 'WeightModule',
  version: '1.0.0',
  description: '體重管理模組 - 使用 @asla/hono-decorator 實現類似 NestJS 的架構',
  routes: [
    'POST /weight - 新增體重記錄',
    'GET /weight - 取得體重記錄列表',
    'GET /weight/latest - 取得最新體重記錄'
  ],
  controllers: ['WeightController'],
  services: ['WeightService'],
  repositories: ['WeightRepository'],
  dependencies: ['FirestoreClient'],
  features: [
    '裝飾器驅動的路由定義',
    '依賴注入支援',
    '型別安全的 DTO',
    '業務邏輯驗證',
    'Firebase Firestore 整合',
    '錯誤處理機制'
  ]
} as const;