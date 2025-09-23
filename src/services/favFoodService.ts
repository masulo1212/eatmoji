import { IFavFoodRepository } from "../repositories/favFoodRepository";
import { FoodEntry } from "../types/favFood";
import { Diary } from "../types/diary";

/**
 * FavFood Service 介面 - 定義業務邏輯操作
 * 對應 Repository 的所有方法，但加入業務邏輯驗證
 */
export interface IFavFoodService {
  /**
   * 獲取使用者的收藏食物列表
   * @param userId 使用者 ID
   * @returns FoodEntry 陣列
   */
  getFoodEntries(userId: string): Promise<FoodEntry[]>;

  /**
   * 根據 ID 獲取單一收藏食物
   * @param userId 使用者 ID  
   * @param id 食物條目 ID
   * @returns FoodEntry 物件或 null
   */
  getFoodEntry(userId: string, id: string): Promise<FoodEntry | null>;

  /**
   * 從 Diary 新增收藏食物
   * **保持完全相同的參數格式，對應 Flutter addFoodEntry({required Diary diary})**
   * @param userId 使用者 ID
   * @param params 包含 diary 的參數物件
   * @returns 建立的 FoodEntry 物件
   */
  addFoodEntry(userId: string, params: { diary: Diary }): Promise<FoodEntry>;

  /**
   * 更新收藏食物
   * @param userId 使用者 ID
   * @param foodEntry 要更新的 FoodEntry 物件
   * @returns void
   */
  updateFoodEntry(userId: string, foodEntry: FoodEntry): Promise<void>;

  /**
   * 刪除收藏食物
   * @param userId 使用者 ID
   * @param id 要刪除的食物條目 ID
   * @returns void
   */
  deleteFoodEntry(userId: string, id: string): Promise<void>;
}

/**
 * FavFood Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
export class FavFoodService implements IFavFoodService {
  constructor(private favFoodRepository: IFavFoodRepository) {}

  /**
   * 獲取收藏食物列表
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則
   * - 委派給 Repository 執行資料查詢
   * 
   * @param userId 使用者 ID
   * @returns FoodEntry 陣列
   */
  async getFoodEntries(userId: string): Promise<FoodEntry[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const foodEntries = await this.favFoodRepository.getFoodEntries(userId);

      // 套用業務規則（例如：過濾、排序、資料轉換等）
      return this.applyBusinessRules(foodEntries);
    } catch (error) {
      console.error("Service: 取得收藏食物列表時發生業務邏輯錯誤:", error);
      throw new Error("取得收藏食物列表失敗");
    }
  }

  /**
   * 獲取單一收藏食物
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能存取自己的收藏食物
   * 
   * @param userId 使用者 ID
   * @param id 食物條目 ID
   * @returns FoodEntry 物件或 null
   */
  async getFoodEntry(userId: string, id: string): Promise<FoodEntry | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!id || id.trim() === "") {
      throw new Error("食物條目 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const foodEntry = await this.favFoodRepository.getFoodEntry(userId, id);

      // 額外的業務邏輯檢查
      if (foodEntry && foodEntry.userId !== userId) {
        // 安全檢查：確保使用者只能存取自己的收藏食物
        console.warn(`使用者 ${userId} 嘗試存取不屬於他的收藏食物 ${id}`);
        return null;
      }

      return foodEntry;
    } catch (error) {
      console.error("Service: 取得收藏食物時發生業務邏輯錯誤:", error);
      throw new Error("取得收藏食物失敗");
    }
  }

  /**
   * 從 Diary 新增收藏食物
   * 業務邏輯：
   * - 驗證必要欄位
   * - 檢查 Diary 的有效性
   * - 確保使用者權限
   * 
   * **完全保持 Flutter 的參數格式：addFoodEntry({required Diary diary})**
   * @param userId 使用者 ID
   * @param params 包含 diary 的參數物件，對應 {required Diary diary}
   * @returns 建立的 FoodEntry 物件
   */
  async addFoodEntry(userId: string, { diary }: { diary: Diary }): Promise<FoodEntry> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!diary) {
      throw new Error("Diary 資料不能為空");
    }

    if (!diary.id || diary.id.trim() === "") {
      throw new Error("Diary ID 不能為空");
    }

    if (!diary.name || diary.name.trim() === "") {
      throw new Error("Diary 名稱不能為空");
    }

    // 套用業務規則和驗證
    const processedDiary = this.applyCreateBusinessRules(diary);

    try {
      // 檢查是否已存在相同 ID 的收藏食物
      const existingFoodEntry = await this.favFoodRepository.getFoodEntry(userId, diary.id);
      if (existingFoodEntry) {
        throw new Error("此食物已在收藏清單中");
      }

      // 委派給 Repository 執行資料建立
      const createdFoodEntry = await this.favFoodRepository.addFoodEntry(userId, { diary: processedDiary });

      return createdFoodEntry;
    } catch (error) {
      console.error("Service: 新增收藏食物時發生業務邏輯錯誤:", error);
      
      // 處理特定錯誤類型
      if (error instanceof Error && error.message.includes("已在收藏清單中")) {
        throw error; // 重新拋出業務邏輯錯誤
      }
      
      throw new Error("新增收藏食物失敗");
    }
  }

  /**
   * 更新收藏食物
   * 業務邏輯：
   * - 驗證更新權限
   * - 套用業務規則
   * - 確保資料一致性
   * 
   * @param userId 使用者 ID
   * @param foodEntry 要更新的 FoodEntry 物件
   */
  async updateFoodEntry(userId: string, foodEntry: FoodEntry): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!foodEntry) {
      throw new Error("FoodEntry 資料不能為空");
    }

    if (!foodEntry.id || foodEntry.id.trim() === "") {
      throw new Error("FoodEntry ID 不能為空");
    }

    if (!foodEntry.name || foodEntry.name.trim() === "") {
      throw new Error("食物名稱不能為空");
    }

    // 檢查 FoodEntry 是否存在且屬於該使用者
    const existingFoodEntry = await this.getFoodEntry(userId, foodEntry.id);
    if (!existingFoodEntry) {
      throw new Error("找不到要更新的收藏食物或您沒有權限更新");
    }

    // 套用更新業務規則
    const processedFoodEntry = this.applyUpdateBusinessRules(foodEntry, existingFoodEntry);

    try {
      // 委派給 Repository 執行資料更新
      await this.favFoodRepository.updateFoodEntry(userId, processedFoodEntry);
    } catch (error) {
      console.error("Service: 更新收藏食物時發生業務邏輯錯誤:", error);
      throw new Error("更新收藏食物失敗");
    }
  }

  /**
   * 刪除收藏食物
   * 業務邏輯：
   * - 驗證刪除權限
   * - 確保使用者只能刪除自己的收藏食物
   * 
   * @param userId 使用者 ID
   * @param id 要刪除的食物條目 ID
   */
  async deleteFoodEntry(userId: string, id: string): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!id || id.trim() === "") {
      throw new Error("食物條目 ID 不能為空");
    }

    // 檢查 FoodEntry 是否存在且屬於該使用者
    const existingFoodEntry = await this.getFoodEntry(userId, id);
    if (!existingFoodEntry) {
      throw new Error("找不到要刪除的收藏食物或您沒有權限刪除");
    }

    try {
      // 委派給 Repository 執行刪除
      await this.favFoodRepository.deleteFoodEntry(userId, id);
    } catch (error) {
      console.error("Service: 刪除收藏食物時發生業務邏輯錯誤:", error);
      throw new Error("刪除收藏食物失敗");
    }
  }

  /**
   * 套用獲取收藏食物列表的業務規則
   * @param foodEntries 原始收藏食物列表
   * @returns 處理後的收藏食物列表
   */
  private applyBusinessRules(foodEntries: FoodEntry[]): FoodEntry[] {
    // 例如：過濾、排序、資料轉換等業務邏輯
    return foodEntries.filter((foodEntry) => {
      // 確保只返回有效的收藏食物
      return foodEntry.name && foodEntry.name.trim() !== "";
    });
  }

  /**
   * 套用新增收藏食物的業務規則
   * @param diary 原始 Diary 資料
   * @returns 處理後的 Diary 資料
   */
  private applyCreateBusinessRules(diary: Diary): Diary {
    return {
      ...diary,
      // 確保必要欄位存在並清理資料
      name: diary.name?.trim(),
      calories: diary.calories || 0,
      protein: diary.protein || 0,
      carbs: diary.carbs || 0,
      fat: diary.fat || 0,
      portions: diary.portions || 1,
    };
  }

  /**
   * 套用更新收藏食物的業務規則
   * @param updates 更新資料
   * @param existingFoodEntry 現有收藏食物
   * @returns 處理後的更新資料
   */
  private applyUpdateBusinessRules(
    updates: FoodEntry,
    _existingFoodEntry: FoodEntry
  ): FoodEntry {
    const processedUpdates = { ...updates };

    // 不允許更新某些欄位
    processedUpdates.userId = _existingFoodEntry.userId; // 確保 userId 不被更改
    processedUpdates.createdAt = _existingFoodEntry.createdAt; // 確保 createdAt 不被更改

    // 清理名稱（如果有更新）
    if (processedUpdates.name) {
      processedUpdates.name = processedUpdates.name.trim();
      if (processedUpdates.name === "") {
        throw new Error("食物名稱不能為空");
      }
    }

    // 確保數值欄位有效
    if (processedUpdates.calories !== undefined && processedUpdates.calories < 0) {
      throw new Error("卡路里不能為負數");
    }
    if (processedUpdates.protein !== undefined && processedUpdates.protein < 0) {
      throw new Error("蛋白質不能為負數");
    }
    if (processedUpdates.carbs !== undefined && processedUpdates.carbs < 0) {
      throw new Error("碳水化合物不能為負數");
    }
    if (processedUpdates.fat !== undefined && processedUpdates.fat < 0) {
      throw new Error("脂肪不能為負數");
    }
    if (processedUpdates.portions !== undefined && processedUpdates.portions <= 0) {
      throw new Error("份量必須大於 0");
    }

    return processedUpdates;
  }
}