import { AppUser } from "../types/user";
import { IUserService } from "../services/userService";

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
 * User Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class UserController {
  constructor(private userService: IUserService) {}

  /**
   * 檢查使用者是否存在
   * 對應 Flutter: checkUserExists(String uid)
   * @param uid 使用者 UID
   * @returns API 響應格式
   */
  async checkUserExists(uid: string): Promise<ApiResponse<boolean>> {
    try {
      // 基本參數驗證
      if (!uid || uid.trim() === "") {
        return {
          success: false,
          error: "使用者 UID 不能為空",
        };
      }

      // 調用 Service 層
      const exists = await this.userService.checkUserExists(uid);

      return {
        success: true,
        result: exists,
      };
    } catch (error) {
      console.error("Controller: 檢查使用者是否存在失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "檢查使用者是否存在時發生未知錯誤",
      };
    }
  }

  /**
   * 取得使用者資料
   * 對應 Flutter: getUser({String? userId})
   * @param uid 使用者 UID
   * @returns API 響應格式
   */
  async getUser(uid: string): Promise<ApiResponse<AppUser | null>> {
    try {
      // 基本參數驗證
      if (!uid || uid.trim() === "") {
        return {
          success: false,
          error: "使用者 UID 不能為空",
        };
      }

      // 調用 Service 層
      const user = await this.userService.getUser(uid);

      return {
        success: true,
        result: user,
      };
    } catch (error) {
      console.error("Controller: 取得使用者資料失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "取得使用者資料時發生未知錯誤",
      };
    }
  }

  /**
   * 建立新使用者
   * 對應 Flutter: createUser(AppUser user)
   * @param user 使用者資料
   * @returns API 響應格式
   */
  async createUser(user: AppUser): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!user) {
        return {
          success: false,
          error: "使用者資料不能為空",
        };
      }

      if (!user.uid || user.uid.trim() === "") {
        return {
          success: false,
          error: "使用者 UID 不能為空",
        };
      }

      if (!user.email || user.email.trim() === "") {
        return {
          success: false,
          error: "使用者 email 不能為空",
        };
      }

      // 調用 Service 層
      await this.userService.createUser(user);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 建立使用者失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "建立使用者時發生未知錯誤",
      };
    }
  }

  /**
   * 更新使用者資料
   * 對應 Flutter: updateUser(Map<String, dynamic> data)
   * @param uid 使用者 UID
   * @param data 要更新的資料
   * @returns API 響應格式
   */
  async updateUser(
    uid: string,
    data: Partial<AppUser>
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!uid || uid.trim() === "") {
        return {
          success: false,
          error: "使用者 UID 不能為空",
        };
      }

      if (!data || Object.keys(data).length === 0) {
        return {
          success: false,
          error: "更新資料不能為空",
        };
      }

      // 調用 Service 層
      await this.userService.updateUser(uid, data);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 更新使用者資料失敗:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "更新使用者資料時發生未知錯誤",
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