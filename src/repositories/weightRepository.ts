import { FirestoreClient } from "firebase-rest-firestore";
import { WeightEntry, firestoreTimestampToDate } from "../types/weight";

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
 */
export class FirestoreWeightRepository implements IWeightRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的 weight collection 參考
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserWeightCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/weight`);
  }

  /**
   * 將 Firestore 文件轉換為 WeightEntry 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 WeightEntry 物件
   */
  private convertFirestoreDocToWeightEntry(doc: any): WeightEntry {
    const data = doc.data();

    return {
      dateId: doc.id, // 使用文件 ID 作為 dateId
      weight: data.weight || 0,
      unit: data.unit || "kg",
      source: data.source || "manual",
      createdAt: firestoreTimestampToDate(data.createdAt),
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
      const collection = this.getUserWeightCollection(userId);
      const docRef = collection.doc(entry.dateId);

      // 檢查文件是否已存在
      const docSnapshot = await docRef.get();

      if (docSnapshot.exists) {
        const existingData = docSnapshot.data();
        if (existingData) {
          const existingCreatedAt = firestoreTimestampToDate(existingData.createdAt);

          // 比較現有 createdAt，若較新則不覆蓋
          if (entry.createdAt <= existingCreatedAt) {
            console.log(`現有資料比較新，跳過寫入: ${entry.dateId}`);
            return;
          }
        }
      }

      // 準備寫入的資料
      const docData = {
        weight: entry.weight,
        unit: entry.unit,
        source: entry.source,
        createdAt: entry.createdAt,
      };

      await docRef.set(docData);
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
      const collection = this.getUserWeightCollection(userId);
      let query;

      if (startDate) {
        // 有 startDate：使用 where + orderBy (對應前端邏輯)
        query = collection
          .where("createdAt", ">=", startDate)
          .orderBy("createdAt", "desc");
      } else {
        // 沒有 startDate：直接使用 collection (對應前端邏輯)
        query = collection;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) =>
        this.convertFirestoreDocToWeightEntry(doc)
      );
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
      const collection = this.getUserWeightCollection(userId);
      const querySnapshot = await collection
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (querySnapshot.docs.length === 0) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return this.convertFirestoreDocToWeightEntry(doc);
    } catch (error) {
      console.error("Repository: 取得最新體重記錄時發生錯誤:", error);
      throw new Error("無法從資料庫取得最新體重記錄");
    }
  }
}