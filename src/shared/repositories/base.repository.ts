import { IFirestoreService } from "../services/firestore.service";
import {
  DocumentWithMetadata,
  EntityConverter,
  QueryConfig,
} from "../types/firestore.types";

/**
 * 支援軟刪除的實體介面
 */
export interface SoftDeletable {
  deletedAt?: Date;
}

/**
 * 基礎 Repository 抽象類別
 * 提供通用的 CRUD 操作模式，子類別只需要實作特定的轉換邏輯
 */
export abstract class BaseRepository<TEntity, TFirestore = any>
  implements EntityConverter<TEntity, TFirestore>
{
  constructor(
    protected firestoreService: IFirestoreService,
    protected collectionName: string
  ) {}

  /**
   * 抽象方法：將 Firestore 資料轉換為實體
   * 子類別必須實作此方法
   */
  abstract fromFirestore(data: TFirestore, id?: string): TEntity;

  /**
   * 抽象方法：將實體轉換為 Firestore 資料
   * 子類別必須實作此方法
   */
  abstract toFirestore(entity: TEntity): TFirestore;

  /**
   * 建構完整的集合路徑
   * 可被子類別覆寫以支援巢狀集合
   */
  protected buildCollectionPath(...segments: string[]): string {
    return [this.collectionName, ...segments].join("/");
  }

  /**
   * 取得單一實體
   */
  protected async get(
    id: string,
    ...pathSegments: string[]
  ): Promise<TEntity | null> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      const data = await this.firestoreService.getDocument(collectionPath, id);

      if (!data) {
        return null;
      }

      return this.fromFirestore(data, id);
    } catch (error) {
      console.error(`BaseRepository.get 錯誤 (${this.collectionName}):`, error);
      throw new Error(`無法取得實體: ${id}`);
    }
  }

  /**
   * 取得實體及其中繼資料
   */
  protected async getWithMetadata(
    id: string,
    ...pathSegments: string[]
  ): Promise<DocumentWithMetadata<TEntity>> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      const result = await this.firestoreService.getDocumentWithMetadata(
        collectionPath,
        id
      );

      return {
        data: result.data ? this.fromFirestore(result.data, id) : null,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error(
        `BaseRepository.getWithMetadata 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`無法取得實體中繼資料: ${id}`);
    }
  }

  /**
   * 建立或設定實體
   */
  protected async create(
    id: string,
    entity: TEntity,
    ...pathSegments: string[]
  ): Promise<void> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      const firestoreData = this.toFirestore(entity);

      await this.firestoreService.setDocument(
        collectionPath,
        id,
        firestoreData
      );
    } catch (error) {
      console.error(
        `BaseRepository.create 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`無法建立實體: ${id}`);
    }
  }

  /**
   * 更新實體
   */
  protected async update(
    id: string,
    partialEntity: Partial<TEntity>,
    ...pathSegments: string[]
  ): Promise<void> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);

      // 將部分實體轉換為 Firestore 格式
      // 注意：這裡假設 toFirestore 可以處理部分資料
      const firestoreData = this.toFirestore(partialEntity as TEntity);

      await this.firestoreService.updateDocument(
        collectionPath,
        id,
        firestoreData
      );
    } catch (error) {
      console.error(
        `BaseRepository.update 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`無法更新實體: ${id}`);
    }
  }

  /**
   * 刪除實體
   */
  protected async delete(id: string, ...pathSegments: string[]): Promise<void> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      await this.firestoreService.deleteDocument(collectionPath, id);
    } catch (error) {
      console.error(
        `BaseRepository.delete 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`無法刪除實體: ${id}`);
    }
  }

  /**
   * 檢查實體是否存在
   */
  protected async exists(
    id: string,
    ...pathSegments: string[]
  ): Promise<boolean> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      return await this.firestoreService.documentExists(collectionPath, id);
    } catch (error) {
      console.error(
        `BaseRepository.exists 錯誤 (${this.collectionName}):`,
        error
      );
      return false;
    }
  }

  /**
   * 查詢多個實體
   */
  protected async query(
    queryConfig: QueryConfig,
    ...pathSegments: string[]
  ): Promise<TEntity[]> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      const results = await this.firestoreService.queryDocuments(
        collectionPath,
        queryConfig
      );

      return results.map((doc) => this.fromFirestore(doc, doc.id));
    } catch (error) {
      console.error(
        `BaseRepository.query 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error("查詢實體失敗");
    }
  }

  /**
   * 取得所有實體
   */
  protected async getAll(...pathSegments: string[]): Promise<TEntity[]> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      const results = await this.firestoreService.getCollection(collectionPath);

      return results.map((doc) => this.fromFirestore(doc, doc.id));
    } catch (error) {
      console.error(
        `BaseRepository.getAll 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error("取得所有實體失敗");
    }
  }

  /**
   * 取得集合大小
   */
  protected async count(
    queryConfig?: QueryConfig,
    ...pathSegments: string[]
  ): Promise<number> {
    try {
      const collectionPath = this.buildCollectionPath(...pathSegments);
      return await this.firestoreService.getCollectionSize(
        collectionPath,
        queryConfig
      );
    } catch (error) {
      console.error(
        `BaseRepository.count 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error("計算實體數量失敗");
    }
  }

  /**
   * 條件式建立：只有在不存在時才建立
   */
  protected async createIfNotExists(
    id: string,
    entity: TEntity,
    ...pathSegments: string[]
  ): Promise<boolean> {
    try {
      const exists = await this.exists(id, ...pathSegments);
      if (!exists) {
        await this.create(id, entity, ...pathSegments);
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        `BaseRepository.createIfNotExists 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`條件式建立失敗: ${id}`);
    }
  }

  /**
   * 軟刪除：標記為已刪除而非真正刪除
   * 只適用於支援軟刪除的實體（實作 SoftDeletable 介面）
   */
  protected async softDelete<T extends TEntity & SoftDeletable>(
    id: string,
    ...pathSegments: string[]
  ): Promise<void> {
    try {
      const updateData: Partial<T> = { deletedAt: new Date() } as Partial<T>;
      await this.update(id, updateData, ...pathSegments);
    } catch (error) {
      console.error(
        `BaseRepository.softDelete 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error(`軟刪除失敗: ${id}`);
    }
  }

  /**
   * 取得最新的一筆記錄
   */
  protected async getLatest(
    orderByField: string,
    ...pathSegments: string[]
  ): Promise<TEntity | null> {
    try {
      const queryConfig: QueryConfig = {
        orderBy: [{ field: orderByField, direction: "desc" }],
        limit: 1,
      };

      const results = await this.query(queryConfig, ...pathSegments);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(
        `BaseRepository.getLatest 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error("取得最新記錄失敗");
    }
  }

  /**
   * 批次操作輔助方法
   */
  protected async bulkCreate(
    entities: Array<{ id: string; data: TEntity }>,
    ...pathSegments: string[]
  ): Promise<void> {
    try {
      // 依序執行建立操作
      for (const entity of entities) {
        await this.create(entity.id, entity.data, ...pathSegments);
      }
    } catch (error) {
      console.error(
        `BaseRepository.bulkCreate 錯誤 (${this.collectionName}):`,
        error
      );
      throw new Error("批次建立失敗");
    }
  }
}
