import { FirestoreClient } from "firebase-rest-firestore";
import {
  BatchOperation,
  DocumentMetadata,
  DocumentWithMetadata,
  FirestoreServiceConfig,
  PaginatedResult,
  QueryConfig,
  QueryOptions,
} from "../types/firestore.types";

/**
 * Injectable decorator 用於標記可注入的服務
 */
export function Injectable() {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return constructor;
  };
}

/**
 * Firestore 服務介面
 * 提供統一的 Firestore 操作抽象層
 */
export interface IFirestoreService {
  // 基本 CRUD 操作
  getDocument(
    collection: string,
    id: string,
    options?: QueryOptions
  ): Promise<any>;
  setDocument(
    collection: string,
    id: string,
    data: any,
    merge?: boolean
  ): Promise<void>;
  updateDocument(collection: string, id: string, data: any): Promise<void>;
  deleteDocument(collection: string, id: string): Promise<void>;

  // 查詢操作
  getCollection(collection: string, queryConfig?: QueryConfig): Promise<any[]>;
  queryDocuments(collection: string, queryConfig: QueryConfig): Promise<any[]>;
  getPaginatedDocuments<T>(
    collection: string,
    queryConfig: QueryConfig,
    pageSize: number
  ): Promise<PaginatedResult<T>>;

  // 進階操作
  documentExists(collection: string, id: string): Promise<boolean>;
  getDocumentWithMetadata(
    collection: string,
    id: string
  ): Promise<DocumentWithMetadata>;
  getCollectionSize(
    collection: string,
    queryConfig?: QueryConfig
  ): Promise<number>;

  // 批次操作
  executeBatch(operations: BatchOperation[]): Promise<void>;

  // 工具方法
  buildQuery(collection: string, queryConfig: QueryConfig): any;
  validateCollectionPath(path: string): boolean;
}

/**
 * Firestore 服務實作
 * 包裝 FirestoreClient 提供更高層次的操作介面
 */
@Injectable()
export class FirestoreService implements IFirestoreService {
  private config: FirestoreServiceConfig;

  constructor(
    private firestore: FirestoreClient,
    config?: Partial<FirestoreServiceConfig>
  ) {
    this.config = {
      cache: { enabled: false },
      retryAttempts: 3,
      timeout: 10000,
      enableLogging: false,
      ...config,
    };
  }

  /**
   * 取得單一文件
   */
  async getDocument(
    collection: string,
    id: string,
    options?: QueryOptions
  ): Promise<any> {
    try {
      this.validateCollectionPath(collection);

      const docRef = this.firestore.collection(collection).doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return null;
      }

      return snapshot.data();
    } catch (error) {
      this.handleError("getDocument", error, { collection, id });
      throw new Error(`無法取得文件: ${collection}/${id}`);
    }
  }

  /**
   * 設定文件資料
   */
  async setDocument(
    collection: string,
    id: string,
    data: any,
    merge: boolean = false
  ): Promise<void> {
    try {
      this.validateCollectionPath(collection);

      const docRef = this.firestore.collection(collection).doc(id);

      if (merge) {
        await docRef.update(data);
      } else {
        await docRef.set(data);
      }
    } catch (error) {
      this.handleError("setDocument", error, { collection, id, merge });
      throw new Error(`無法設定文件: ${collection}/${id}`);
    }
  }

  /**
   * 更新文件資料
   */
  async updateDocument(
    collection: string,
    id: string,
    data: any
  ): Promise<void> {
    try {
      this.validateCollectionPath(collection);

      const docRef = this.firestore.collection(collection).doc(id);
      await docRef.update(data);
    } catch (error) {
      this.handleError("updateDocument", error, { collection, id });
      throw new Error(`無法更新文件: ${collection}/${id}`);
    }
  }

  /**
   * 刪除文件
   */
  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      this.validateCollectionPath(collection);

      const docRef = this.firestore.collection(collection).doc(id);
      await docRef.delete();
    } catch (error) {
      this.handleError("deleteDocument", error, { collection, id });
      throw new Error(`無法刪除文件: ${collection}/${id}`);
    }
  }

  /**
   * 取得集合中的所有文件
   */
  async getCollection(
    collection: string,
    queryConfig?: QueryConfig
  ): Promise<any[]> {
    try {
      this.validateCollectionPath(collection);

      let query = this.firestore.collection(collection);

      if (queryConfig) {
        query = this.buildQuery(collection, queryConfig);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      this.handleError("getCollection", error, { collection, queryConfig });
      throw new Error(`無法取得集合: ${collection}`);
    }
  }

  /**
   * 查詢文件
   */
  async queryDocuments(
    collection: string,
    queryConfig: QueryConfig
  ): Promise<any[]> {
    return this.getCollection(collection, queryConfig);
  }

  /**
   * 分頁查詢文件
   */
  async getPaginatedDocuments<T>(
    collection: string,
    queryConfig: QueryConfig,
    pageSize: number
  ): Promise<PaginatedResult<T>> {
    try {
      const config = { ...queryConfig, limit: pageSize };
      const documents = await this.queryDocuments(collection, config);

      return {
        data: documents as T[],
        hasMore: documents.length === pageSize,
        lastDocument:
          documents.length > 0 ? documents[documents.length - 1] : undefined,
      };
    } catch (error) {
      this.handleError("getPaginatedDocuments", error, {
        collection,
        queryConfig,
        pageSize,
      });
      throw new Error(`無法執行分頁查詢: ${collection}`);
    }
  }

  /**
   * 檢查文件是否存在
   */
  async documentExists(collection: string, id: string): Promise<boolean> {
    try {
      const doc = await this.getDocument(collection, id);
      return doc !== null;
    } catch (error) {
      this.handleError("documentExists", error, { collection, id });
      return false;
    }
  }

  /**
   * 取得文件及其中繼資料
   */
  async getDocumentWithMetadata(
    collection: string,
    id: string
  ): Promise<DocumentWithMetadata> {
    try {
      this.validateCollectionPath(collection);

      const docRef = this.firestore.collection(collection).doc(id);
      const snapshot = await docRef.get();

      const metadata: DocumentMetadata = {
        id,
        exists: snapshot.exists,
        // Note: firebase-rest-firestore 不提供 createTime/updateTime
        // 如需要這些資訊，可以在文件中手動維護時間戳
        createTime: undefined,
        updateTime: undefined,
      };

      return {
        data: snapshot.exists ? snapshot.data() : null,
        metadata,
      };
    } catch (error) {
      this.handleError("getDocumentWithMetadata", error, { collection, id });
      throw new Error(`無法取得文件中繼資料: ${collection}/${id}`);
    }
  }

  /**
   * 取得集合大小
   */
  async getCollectionSize(
    collection: string,
    queryConfig?: QueryConfig
  ): Promise<number> {
    try {
      const documents = await this.getCollection(collection, queryConfig);
      return documents.length;
    } catch (error) {
      this.handleError("getCollectionSize", error, { collection, queryConfig });
      throw new Error(`無法取得集合大小: ${collection}`);
    }
  }

  /**
   * 執行批次操作
   */
  async executeBatch(operations: BatchOperation[]): Promise<void> {
    try {
      // 注意：firebase-rest-firestore 可能不支援批次操作
      // 這裡使用順序執行作為替代方案
      for (const operation of operations) {
        switch (operation.type) {
          case "set":
            await this.setDocument(
              operation.collection,
              operation.id,
              operation.data,
              operation.merge
            );
            break;
          case "update":
            await this.updateDocument(
              operation.collection,
              operation.id,
              operation.data
            );
            break;
          case "delete":
            await this.deleteDocument(operation.collection, operation.id);
            break;
        }
      }
    } catch (error) {
      this.handleError("executeBatch", error, { operations });
      throw new Error("批次操作執行失敗");
    }
  }

  /**
   * 建構查詢
   */
  buildQuery(collection: string, queryConfig: QueryConfig): any {
    // 使用 any 類型避免 CollectionReference 和 Query 之間的類型衝突
    let query: any = this.firestore.collection(collection);

    // 應用查詢條件
    if (queryConfig.conditions) {
      for (const condition of queryConfig.conditions) {
        query = query.where(
          condition.field,
          condition.operator,
          condition.value
        );
      }
    }

    // 應用排序
    if (queryConfig.orderBy) {
      for (const sort of queryConfig.orderBy) {
        query = query.orderBy(sort.field, sort.direction);
      }
    }

    // 應用限制
    if (queryConfig.limit) {
      query = query.limit(queryConfig.limit);
    }

    return query;
  }

  /**
   * 驗證集合路徑
   */
  validateCollectionPath(path: string): boolean {
    if (!path || typeof path !== "string" || path.trim() === "") {
      throw new Error("集合路徑不能為空");
    }

    // 檢查路徑格式（奇數段為集合，偶數段為文件）
    const segments = path.split("/").filter((segment) => segment.length > 0);
    if (segments.length % 2 === 0) {
      throw new Error("無效的集合路徑格式");
    }

    return true;
  }

  /**
   * 統一錯誤處理
   */
  private handleError(operation: string, error: any, context?: any): void {
    if (this.config.enableLogging) {
      console.error(`FirestoreService.${operation} 錯誤:`, {
        error: error.message || error,
        context,
      });
    }
  }
}
