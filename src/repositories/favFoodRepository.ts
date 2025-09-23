import { FirestoreClient } from "firebase-rest-firestore";
import { Diary } from "../types/diary";
import { FoodEntry, convertFirestoreDocToFoodEntry } from "../types/favFood";

/**
 * FavFood Repository 介面 - 定義資料存取操作
 * 完全對應 Flutter FoodDBRepositoryImpl 的方法簽名
 */
export interface IFavFoodRepository {
  /**
   * 獲取使用者的收藏食物列表
   * 對應 Flutter getFoodEntries() 方法
   * @param userId 使用者 ID
   * @returns FoodEntry 陣列
   */
  getFoodEntries(userId: string): Promise<FoodEntry[]>;

  /**
   * 根據 ID 獲取單一收藏食物
   * 對應 Flutter getFoodEntry(String id) 方法
   * @param userId 使用者 ID
   * @param id 食物條目 ID
   * @returns FoodEntry 物件或 null
   */
  getFoodEntry(userId: string, id: string): Promise<FoodEntry | null>;

  /**
   * 從 Diary 新增收藏食物
   * 對應 Flutter addFoodEntry({required Diary diary}) 方法
   * **保持完全相同的參數格式**
   * @param userId 使用者 ID
   * @param params 包含 diary 的參數物件
   * @returns 建立的 FoodEntry 物件
   */
  addFoodEntry(userId: string, params: { diary: Diary }): Promise<FoodEntry>;

  /**
   * 更新收藏食物
   * 對應 Flutter updateFoodEntry(FoodEntry foodEntry) 方法
   * @param userId 使用者 ID
   * @param foodEntry 要更新的 FoodEntry 物件
   * @returns void
   */
  updateFoodEntry(userId: string, foodEntry: FoodEntry): Promise<void>;

  /**
   * 刪除收藏食物
   * 對應 Flutter deleteFoodEntry(String id) 方法
   * @param userId 使用者 ID
   * @param id 要刪除的食物條目 ID
   * @returns void
   */
  deleteFoodEntry(userId: string, id: string): Promise<void>;
}

/**
 * Firestore FavFood Repository 實作
 * 完全對應 Flutter FoodDBRepositoryImpl 的實現邏輯
 */
export class FirestoreFavFoodRepository implements IFavFoodRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的收藏食物 collection 參考
   * 對應 Flutter _foodDBRef() 方法
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserFavFoodCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/fav_foods`);
  }

  /**
   * 獲取收藏食物列表
   * 對應 Flutter getFoodEntries() 方法：
   * - 按 createdAt 降序排列
   * @param userId 使用者 ID
   * @returns FoodEntry 陣列
   */
  async getFoodEntries(userId: string): Promise<FoodEntry[]> {
    try {
      const collection = this.getUserFavFoodCollection(userId);
      const query = collection.orderBy("createdAt", "desc");
      const snapshot = await query.get();

      return snapshot.docs.map((doc) => convertFirestoreDocToFoodEntry(doc));
    } catch (error) {
      console.error("Repository: 取得收藏食物列表時發生錯誤:", error);
      throw new Error("無法從資料庫取得收藏食物列表");
    }
  }

  /**
   * 根據 ID 獲取單一收藏食物
   * 對應 Flutter getFoodEntry(String id) 方法：
   * - 如果文件不存在則返回 null
   * @param userId 使用者 ID
   * @param id 食物條目 ID
   * @returns FoodEntry 物件或 null
   */
  async getFoodEntry(userId: string, id: string): Promise<FoodEntry | null> {
    try {
      const collection = this.getUserFavFoodCollection(userId);
      const doc = await collection.doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return convertFirestoreDocToFoodEntry(doc);
    } catch (error) {
      console.error("Repository: 取得收藏食物時發生錯誤:", error);
      throw new Error("無法從資料庫取得收藏食物");
    }
  }

  /**
   * 從 Diary 新增收藏食物
   * 對應 Flutter addFoodEntry({required Diary diary}) 方法：
   * - 使用 diary.id 作為文件 ID
   * - 將 Diary 屬性映射到 FoodEntry
   * - 設定預設值：isPublic: false, version: 1, importedCount: 0
   * - 自動設定 createdAt 和 updatedAt
   *
   * **完全保持 Flutter 的參數格式：{required Diary diary}**
   * @param userId 使用者 ID
   * @param params 包含 diary 的參數物件，對應 {required Diary diary}
   * @returns 建立的 FoodEntry 物件
   */
  async addFoodEntry(
    userId: string,
    { diary }: { diary: Diary }
  ): Promise<FoodEntry> {
    try {
      const collection = this.getUserFavFoodCollection(userId);
      const now = new Date();

      // 使用 diary.id 作為文件 ID（對應 Flutter 邏輯）
      const docRef = collection.doc(diary.id);

      // 創建 FoodEntry，完全對應 Flutter newFood 的建立邏輯
      const newFoodEntry: FoodEntry = {
        id: diary.id,
        name: diary.name,
        brand: diary.brand,
        calories: diary.calories,
        protein: diary.protein,
        carbs: diary.carbs,
        fat: diary.fat,
        portions: diary.portions,
        ingredients: diary.ingredients,
        userId: userId,
        stickerImg: diary.stickerImg || undefined,
        originalImgs: diary.originalImgs || undefined,
        healthAssessment: diary.healthAssessment,
        // 對應 Flutter 的預設值
        isPublic: false,
        version: 1,
        importedCount: 0,
        // 時間戳
        createdAt: now,
        updatedAt: now,
      };

      // 將資料寫入 Firestore
      await docRef.set(newFoodEntry);

      // 返回包含 ID 的完整 FoodEntry
      return newFoodEntry;
    } catch (error) {
      console.error("Repository: 新增收藏食物時發生錯誤:", error);
      throw new Error("無法新增收藏食物到資料庫");
    }
  }

  /**
   * 更新收藏食物
   * 對應 Flutter updateFoodEntry(FoodEntry foodEntry) 方法：
   * - 更新 updatedAt 時間戳
   * @param userId 使用者 ID
   * @param foodEntry 要更新的 FoodEntry 物件
   */
  async updateFoodEntry(userId: string, foodEntry: FoodEntry): Promise<void> {
    try {
      const collection = this.getUserFavFoodCollection(userId);

      if (!foodEntry.id) {
        throw new Error("FoodEntry ID 不能為空");
      }

      // 準備更新資料，對應 Flutter 的 toJson()..['updatedAt'] = DateTime.now()
      const updateData = {
        ...foodEntry,
        updatedAt: new Date(),
      };

      // 移除 id 欄位，避免重複儲存
      delete (updateData as any).id;

      await collection.doc(foodEntry.id).update(updateData);
    } catch (error) {
      console.error("Repository: 更新收藏食物時發生錯誤:", error);
      throw new Error("無法更新收藏食物");
    }
  }

  /**
   * 刪除收藏食物
   * 對應 Flutter deleteFoodEntry(String id) 方法：
   * - 物理刪除文件（不是軟刪除）
   * - 註解提到："這裡不能刪掉圖片，因為其他地方可能倒入這個食物"
   * @param userId 使用者 ID
   * @param id 要刪除的食物條目 ID
   */
  async deleteFoodEntry(userId: string, id: string): Promise<void> {
    try {
      const collection = this.getUserFavFoodCollection(userId);
      await collection.doc(id).delete();

      // 對應 Flutter 註解：這裡不能刪掉圖片，因為其他地方可能倒入這個食物
      // 因此我們只刪除 Firestore 文件，不處理圖片檔案
    } catch (error) {
      console.error("Repository: 刪除收藏食物時發生錯誤:", error);
      throw new Error("無法刪除收藏食物");
    }
  }
}
