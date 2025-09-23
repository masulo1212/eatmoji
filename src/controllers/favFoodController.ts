import { FoodEntry } from "../types/favFood";
import { Diary } from "../types/diary";
import { IFavFoodService } from "../services/favFoodService";

/**
 * FavFood Service 介面 - Controller 層的 Service 依賴
 */
export interface IFavFoodControllerService {
  getFoodEntries(userId: string): Promise<FoodEntry[]>;
  getFoodEntry(userId: string, id: string): Promise<FoodEntry | null>;
  addFoodEntry(userId: string, params: { diary: Diary }): Promise<FoodEntry>;
  updateFoodEntry(userId: string, foodEntry: FoodEntry): Promise<void>;
  deleteFoodEntry(userId: string, id: string): Promise<void>;
}

/**
 * API 響應格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * API 錯誤響應格式
 */
export interface ApiErrorResponse {
  success: false;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

/**
 * FavFood Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class FavFoodController {
  constructor(private favFoodService: IFavFoodService) {}

  /**
   * 獲取收藏食物列表
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getFoodEntries(userId: string): Promise<ApiResponse<FoodEntry[]>> {
    try {
      // 調用 Service 層
      const foodEntries = await this.favFoodService.getFoodEntries(userId);

      return {
        success: true,
        result: foodEntries,
      };
    } catch (error) {
      console.error("Controller: 獲取收藏食物列表失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "獲取收藏食物列表時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取單一收藏食物
   * @param userId 使用者 ID
   * @param id 食物條目 ID
   * @returns API 響應格式
   */
  async getFoodEntry(
    userId: string,
    id: string
  ): Promise<ApiResponse<FoodEntry | null>> {
    try {
      // 基本參數驗證
      if (!id.trim()) {
        return {
          success: false,
          error: "食物條目 ID 不能為空",
        };
      }

      // 調用 Service 層
      const foodEntry = await this.favFoodService.getFoodEntry(userId, id);

      return {
        success: true,
        result: foodEntry,
      };
    } catch (error) {
      console.error("Controller: 獲取收藏食物失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "獲取收藏食物時發生未知錯誤",
      };
    }
  }

  /**
   * 從 Diary 新增收藏食物
   * **完全保持 Flutter 的參數格式：addFoodEntry({required Diary diary})**
   * @param userId 使用者 ID
   * @param params 包含 diary 的參數物件，對應 {required Diary diary}
   * @returns API 響應格式
   */
  async addFoodEntry(
    userId: string,
    { diary }: { diary: Diary }
  ): Promise<ApiResponse<FoodEntry>> {
    try {
      // 基本參數驗證
      if (!diary) {
        return {
          success: false,
          error: "Diary 資料不能為空",
        };
      }

      if (!diary.name?.trim()) {
        return {
          success: false,
          error: "Diary 名稱不能為空",
        };
      }

      if (!diary.id?.trim()) {
        return {
          success: false,
          error: "Diary ID 不能為空",
        };
      }

      // 調用 Service 層，保持相同的參數格式
      const createdFoodEntry = await this.favFoodService.addFoodEntry(userId, { diary });

      return {
        success: true,
        result: createdFoodEntry,
      };
    } catch (error) {
      console.error("Controller: 新增收藏食物失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "新增收藏食物時發生未知錯誤",
      };
    }
  }

  /**
   * 更新收藏食物
   * @param userId 使用者 ID
   * @param foodEntry 要更新的 FoodEntry 物件
   * @returns API 響應格式
   */
  async updateFoodEntry(
    userId: string,
    foodEntry: FoodEntry
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!foodEntry) {
        return {
          success: false,
          error: "FoodEntry 資料不能為空",
        };
      }

      if (!foodEntry.id?.trim()) {
        return {
          success: false,
          error: "FoodEntry ID 不能為空",
        };
      }

      if (!foodEntry.name?.trim()) {
        return {
          success: false,
          error: "食物名稱不能為空",
        };
      }

      // 驗證數值欄位
      if (foodEntry.calories !== undefined && foodEntry.calories < 0) {
        return {
          success: false,
          error: "卡路里不能為負數",
        };
      }

      if (foodEntry.protein !== undefined && foodEntry.protein < 0) {
        return {
          success: false,
          error: "蛋白質不能為負數",
        };
      }

      if (foodEntry.carbs !== undefined && foodEntry.carbs < 0) {
        return {
          success: false,
          error: "碳水化合物不能為負數",
        };
      }

      if (foodEntry.fat !== undefined && foodEntry.fat < 0) {
        return {
          success: false,
          error: "脂肪不能為負數",
        };
      }

      if (foodEntry.portions !== undefined && foodEntry.portions <= 0) {
        return {
          success: false,
          error: "份量必須大於 0",
        };
      }

      // 調用 Service 層
      await this.favFoodService.updateFoodEntry(userId, foodEntry);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 更新收藏食物失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "更新收藏食物時發生未知錯誤",
      };
    }
  }

  /**
   * 刪除收藏食物
   * @param userId 使用者 ID
   * @param id 要刪除的食物條目 ID
   * @returns API 響應格式
   */
  async deleteFoodEntry(
    userId: string,
    id: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!id.trim()) {
        return {
          success: false,
          error: "食物條目 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.favFoodService.deleteFoodEntry(userId, id);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 刪除收藏食物失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "刪除收藏食物時發生未知錯誤",
      };
    }
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ): ApiErrorResponse {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }
}