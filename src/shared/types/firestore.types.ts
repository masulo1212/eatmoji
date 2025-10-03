/**
 * Firestore 共用型別定義
 */

/**
 * 查詢操作符
 */
export type FirestoreOperator = 
  | "==" 
  | "!=" 
  | "<" 
  | "<=" 
  | ">" 
  | ">=" 
  | "array-contains" 
  | "array-contains-any" 
  | "in" 
  | "not-in";

/**
 * 排序方向
 */
export type FirestoreSortDirection = "asc" | "desc";

/**
 * 查詢條件配置
 */
export interface QueryCondition {
  field: string;
  operator: FirestoreOperator;
  value: any;
}

/**
 * 排序配置
 */
export interface SortConfig {
  field: string;
  direction: FirestoreSortDirection;
}

/**
 * 查詢配置
 */
export interface QueryConfig {
  conditions?: QueryCondition[];
  orderBy?: SortConfig[];
  limit?: number;
  startAfter?: any;
  endBefore?: any;
}

/**
 * 文件中繼資料
 */
export interface DocumentMetadata {
  id: string;
  exists: boolean;
  createTime?: Date;
  updateTime?: Date;
}

/**
 * 包含中繼資料的文件
 */
export interface DocumentWithMetadata<T = any> {
  data: T | null;
  metadata: DocumentMetadata;
}

/**
 * 批次操作類型
 */
export type BatchOperationType = "set" | "update" | "delete";

/**
 * 批次操作項目
 */
export interface BatchOperation {
  type: BatchOperationType;
  collection: string;
  id: string;
  data?: any;
  merge?: boolean;
}

/**
 * 分頁查詢結果
 */
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  lastDocument?: any;
  total?: number;
}

/**
 * Firestore 錯誤資訊
 */
export interface FirestoreError {
  code: string;
  message: string;
  details?: any;
}

/**
 * 查詢選項
 */
export interface QueryOptions {
  includeMetadata?: boolean;
  source?: "default" | "server" | "cache";
  timeout?: number;
}

/**
 * 交易配置
 */
export interface TransactionConfig {
  maxAttempts?: number;
  timeout?: number;
}

/**
 * Firestore 時間戳轉換工具
 */
export interface TimestampConverter {
  toDate(timestamp: any): Date;
  fromDate(date: Date): any;
}

/**
 * 通用的 Firestore 文件介面
 */
export interface FirestoreDocument {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 實體轉換器介面
 */
export interface EntityConverter<TEntity, TFirestore = any> {
  toFirestore(entity: TEntity): TFirestore;
  fromFirestore(data: TFirestore, id?: string): TEntity;
}

/**
 * 集合路徑建構器
 */
export interface CollectionPathBuilder {
  build(...segments: string[]): string;
  user(userId: string): CollectionPathBuilder;
  collection(name: string): CollectionPathBuilder;
}

/**
 * 快取配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
}

/**
 * Firestore 服務配置
 */
export interface FirestoreServiceConfig {
  cache?: CacheConfig;
  retryAttempts?: number;
  timeout?: number;
  enableLogging?: boolean;
}