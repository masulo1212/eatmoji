import { Diary } from "../types/diary";
import { CreateDiaryWithImagesRequest } from "../types/image";

/**
 * Diary Service 介面 - 定義業務邏輯操作
 */
export interface IDiaryService {
  getDiaries(userId: string, date?: Date): Promise<Diary[]>;
  getDiary(userId: string, diaryId: string): Promise<Diary | null>;
  createDiary(userId: string, diaryData: Partial<Diary>): Promise<Diary>;
  createDiaryWithImages(
    userId: string,
    request: CreateDiaryWithImagesRequest
  ): Promise<Diary>;
  updateDiary(
    userId: string,
    diaryId: string,
    updates: Partial<Diary>
  ): Promise<Diary>;
  deleteDiary(userId: string, diaryId: string): Promise<void>;
  calculateStreak(userId: string): Promise<number>;
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
 * Diary Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class DiaryController {
  constructor(private diaryService: IDiaryService) {}

  /**
   * 取得 diary 列表
   * @param userId 使用者 ID
   * @param dateString 可選的日期字串 (YYYY-MM-DD)
   * @returns API 響應格式
   */
  async getDiaries(
    userId: string,
    dateString?: string
  ): Promise<ApiResponse<Diary[]>> {
    try {
      // 驗證和轉換日期參數
      let dateFilter: Date | undefined;
      if (dateString) {
        dateFilter = new Date(dateString);
        if (isNaN(dateFilter.getTime())) {
          return {
            success: false,
            error: "無效的日期格式，請使用 YYYY-MM-DD 格式",
          };
        }
      }

      // 調用 Service 層
      const diaries = await this.diaryService.getDiaries(userId, dateFilter);

      return {
        success: true,
        result: diaries,
      };
    } catch (error) {
      console.error("Controller: 取得 diary 列表失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得 diary 列表時發生未知錯誤",
      };
    }
  }

  /**
   * 取得單一 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @returns API 響應格式
   */
  async getDiary(
    userId: string,
    diaryId: string
  ): Promise<ApiResponse<Diary | null>> {
    try {
      // 基本參數驗證
      if (!diaryId.trim()) {
        return {
          success: false,
          error: "Diary ID 不能為空",
        };
      }

      // 調用 Service 層
      const diary = await this.diaryService.getDiary(userId, diaryId);

      return {
        success: true,
        result: diary,
      };
    } catch (error) {
      console.error("Controller: 取得 diary 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "取得 diary 時發生未知錯誤",
      };
    }
  }

  /**
   * 建立新的 diary
   * @param userId 使用者 ID
   * @param diaryData Diary 資料
   * @returns API 響應格式
   */
  async createDiary(
    userId: string,
    diaryData: Partial<Diary>
  ): Promise<ApiResponse<Diary>> {
    try {
      // 基本參數驗證
      if (!diaryData.name?.trim()) {
        return {
          success: false,
          error: "Diary 名稱不能為空",
        };
      }

      // 調用 Service 層
      const createdDiary = await this.diaryService.createDiary(
        userId,
        diaryData
      );

      return {
        success: true,
        result: createdDiary,
      };
    } catch (error) {
      console.error("Controller: 建立 diary 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "建立 diary 時發生未知錯誤",
      };
    }
  }

  /**
   * 建立包含圖片的新 diary
   * @param userId 使用者 ID
   * @param request 包含圖片的 Diary 建立請求
   * @returns API 響應格式
   */
  async createDiaryWithImages(
    userId: string,
    request: CreateDiaryWithImagesRequest
  ): Promise<ApiResponse<Diary>> {
    try {
      // 基本參數驗證
      if (!request.diaryData.name?.trim()) {
        return {
          success: false,
          error: "Diary 名稱不能為空",
        };
      }

      // 驗證圖片資料（如果有的話）
      if (request.originalImgs) {
        if (request.originalImgs.length > 10) {
          return {
            success: false,
            error: "原始圖片數量不能超過 10 張",
          };
        }
      }

      // 調用 Service 層處理圖片和建立 diary
      const createdDiary = await this.diaryService.createDiaryWithImages(
        userId,
        request
      );

      return {
        success: true,
        result: createdDiary,
      };
    } catch (error) {
      console.error("Controller: 建立包含圖片的 diary 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "建立包含圖片的 diary 時發生未知錯誤",
      };
    }
  }

  /**
   * 更新現有 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @param updates 更新資料
   * @returns API 響應格式
   */
  async updateDiary(
    userId: string,
    diaryId: string,
    updates: Partial<Diary>
  ): Promise<ApiResponse<Diary>> {
    try {
      // 基本參數驗證
      if (!diaryId.trim()) {
        return {
          success: false,
          error: "Diary ID 不能為空",
        };
      }

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          error: "更新資料不能為空",
        };
      }

      // 調用 Service 層
      const updatedDiary = await this.diaryService.updateDiary(
        userId,
        diaryId,
        updates
      );

      return {
        success: true,
        result: updatedDiary,
      };
    } catch (error) {
      console.error("Controller: 更新 diary 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "更新 diary 時發生未知錯誤",
      };
    }
  }

  /**
   * 刪除 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @returns API 響應格式
   */
  async deleteDiary(
    userId: string,
    diaryId: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!diaryId.trim()) {
        return {
          success: false,
          error: "Diary ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.diaryService.deleteDiary(userId, diaryId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 刪除 diary 失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "刪除 diary 時發生未知錯誤",
      };
    }
  }

  /**
   * 計算連續天數
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async calculateStreak(userId: string): Promise<ApiResponse<number>> {
    try {
      // 調用 Service 層
      const streak = await this.diaryService.calculateStreak(userId);

      return {
        success: true,
        result: streak,
      };
    } catch (error) {
      console.error("Controller: 計算連續天數失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "計算連續天數時發生未知錯誤",
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
