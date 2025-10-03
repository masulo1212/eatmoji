import { WeightEntry, firestoreTimestampToDate } from "./types/weight.types";
import { BaseRepository, IFirestoreService, Injectable } from "../../shared";
import { QueryConfig } from "../../shared/types/firestore.types";

/**
 * Weight Repository 介面 - 定義體重資料存取操作
 */
export interface IWeightRepository {
  /**
   * 新增體重記錄
   * 對應前端的 addWeight 方法
   * @param userId 使用者 ID
   * @param entry 體重記錄資料
   */
  addWeight(userId: string, entry: WeightEntry): Promise<void>;

  /**
   * 取得體重記錄列表
   * 對應前端的 getWeight 方法
   * @param userId 使用者 ID
   * @param startDate 可選的開始日期過濾條件
   * @returns WeightEntry 陣列
   */
  getWeight(userId: string, startDate?: Date): Promise<WeightEntry[]>;

  /**
   * 取得最新的體重記錄
   * 對應前端的 getLatestWeight 方法
   * @param userId 使用者 ID
   * @returns 最新的 WeightEntry 或 null
   */
  getLatestWeight(userId: string): Promise<WeightEntry | null>;
}

/**
 * Firestore Weight Repository 實作
 * 繼承 BaseRepository 減少重複程式碼
 */
@Injectable()
export class WeightRepository extends BaseRepository<WeightEntry> implements IWeightRepository {
  constructor(firestoreService: IFirestoreService) {
    super(firestoreService, 'weight');
  }

  /**
   * 重寫 buildCollectionPath 以處理 users/{userId}/weight 的巢狀結構
   * 當傳入 'users' 和 userId 時，建構正確的路徑順序
   */
  protected buildCollectionPath(...segments: string[]): string {
    // 檢查是否是 users/{userId}/weight 的模式
    if (segments.length === 2 && segments[0] === 'users') {
      const userId = segments[1];
      return `users/${userId}/${this.collectionName}`;
    }
    
    // 其他情況使用預設邏輯
    return [this.collectionName, ...segments].join("/");
  }

  /**
   * 實作 BaseRepository 抽象方法：從 Firestore 資料轉換為 WeightEntry
   */
  fromFirestore(data: any, id?: string): WeightEntry {
    return {
      dateId: id || data.dateId,
      weight: data.weight || 0,
      unit: data.unit || "kg",
      source: data.source || "manual",
      createdAt: firestoreTimestampToDate(data.createdAt),
    };
  }

  /**
   * 實作 BaseRepository 抽象方法：將 WeightEntry 轉換為 Firestore 資料
   */
  toFirestore(entry: WeightEntry): any {
    return {
      weight: entry.weight,
      unit: entry.unit,
      source: entry.source,
      createdAt: entry.createdAt,
    };
  }

  /**
   * 新增體重記錄
   * 對應前端 addWeight 邏輯：
   * - 使用 dateId 作為文件 ID
   * - 如果文件已存在，比較 createdAt 時間
   * - 如果新記錄較舊，則跳過寫入
   * - 如果新記錄較新或相等，則覆蓋現有記錄
   */
  async addWeight(userId: string, entry: WeightEntry): Promise<void> {
    try {
      // 檢查文件是否已存在
      const existingEntry = await this.get(entry.dateId, 'users', userId);

      if (existingEntry) {
        // 比較現有 createdAt，若較新則不覆蓋
        if (entry.createdAt <= existingEntry.createdAt) {
          console.log(`現有資料比較新，跳過寫入: ${entry.dateId}`);
          return;
        }
      }

      // 建立或更新記錄
      await this.create(entry.dateId, entry, 'users', userId);
    } catch (error) {
      console.error("Repository: 新增體重記錄時發生錯誤:", error);
      throw new Error("無法新增體重記錄到資料庫");
    }
  }

  /**
   * 取得體重記錄列表
   * 對應前端 getWeight 邏輯：
   * - 有 startDate：使用 where 過濾 + createdAt 降序排列
   * - 沒有 startDate：直接取得所有記錄（無排序）
   */
  async getWeight(userId: string, startDate?: Date): Promise<WeightEntry[]> {
    try {
      if (startDate) {
        // 有 startDate：使用查詢條件
        const queryConfig: QueryConfig = {
          conditions: [
            { field: "createdAt", operator: ">=", value: startDate }
          ],
          orderBy: [
            { field: "createdAt", direction: "desc" }
          ]
        };
        return await this.query(queryConfig, 'users', userId);
      } else {
        // 沒有 startDate：取得所有記錄
        return await this.getAll('users', userId);
      }
    } catch (error) {
      console.error("Repository: 取得體重記錄列表時發生錯誤:", error);
      throw new Error("無法從資料庫取得體重記錄列表");
    }
  }

  /**
   * 取得最新的體重記錄
   * 對應前端 getLatestWeight 邏輯：
   * - 按 createdAt 降序排列並限制為 1 筆
   * - 如果沒有記錄，返回 null
   */
  async getLatestWeight(userId: string): Promise<WeightEntry | null> {
    try {
      return await this.getLatest("createdAt", 'users', userId);
    } catch (error) {
      console.error("Repository: 取得最新體重記錄時發生錯誤:", error);
      throw new Error("無法從資料庫取得最新體重記錄");
    }
  }
}