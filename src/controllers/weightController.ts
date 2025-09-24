import { WeightEntry } from "../types/weight";
import { IWeightService } from "../services/weightService";

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
 * Weight Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class WeightController {
  constructor(private weightService: IWeightService) {}

  /**
   * 新增體重記錄
   * @param userId 使用者 ID
   * @param weightData 體重記錄資料
   * @returns API 響應格式
   */
  async addWeight(
    userId: string,
    weightData: Partial<WeightEntry>
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!weightData.weight || weightData.weight <= 0) {
        return {
          success: false,
          error: "體重必須為正數",
        };
      }

      if (!weightData.unit?.trim()) {
        return {
          success: false,
          error: "體重單位不能為空",
        };
      }

      // 調用 Service 層
      await this.weightService.addWeight(userId, weightData);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 新增體重記錄失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "新增體重記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 取得體重記錄列表
   * @param userId 使用者 ID
   * @param startDateString 可選的開始日期字串 (YYYY-MM-DD)
   * @returns API 響應格式
   */
  async getWeight(
    userId: string,
    startDateString?: string
  ): Promise<ApiResponse<WeightEntry[]>> {
    try {
      // 驗證和轉換日期參數
      let startDate: Date | undefined;
      if (startDateString) {
        startDate = new Date(startDateString);
        if (isNaN(startDate.getTime())) {
          return {
            success: false,
            error: "無效的日期格式，請使用 YYYY-MM-DD 格式",
          };
        }
      }

      // 調用 Service 層
      const weights = await this.weightService.getWeight(userId, startDate);

      return {
        success: true,
        result: weights,
      };
    } catch (error) {
      console.error("Controller: 取得體重記錄列表失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得體重記錄列表時發生未知錯誤",
      };
    }
  }

  /**
   * 取得最新體重記錄
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getLatestWeight(
    userId: string
  ): Promise<ApiResponse<WeightEntry | null>> {
    try {
      // 調用 Service 層
      const latestWeight = await this.weightService.getLatestWeight(userId);

      return {
        success: true,
        result: latestWeight,
      };
    } catch (error) {
      console.error("Controller: 取得最新體重記錄失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得最新體重記錄時發生未知錯誤",
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